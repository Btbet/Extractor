from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List
from extract import extract_cv_data
from pypdf import PdfReader
from io import BytesIO
import json
import os
from docx import Document
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib import styles
from openpyxl import Workbook
from matcher import (
    extract_job_skills,
    calculate_match_score,
    generate_summary
)

app = FastAPI()
candidates_db = []

app.mount(
    "/static",
    StaticFiles(directory="."),
    name="static"
)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/")
async def dashboard():
    return FileResponse("index.html")

DB_FILE = "candidates.json"
STATS_FILE = "stats.json"

if not os.path.exists(DB_FILE):
    with open(DB_FILE, "w") as f:
        json.dump([], f)

if not os.path.exists(STATS_FILE):
    with open(STATS_FILE, "w") as f:
        json.dump(
            {"total_uploads": 0},
            f
        )

@app.get("/health")

async def health():
    return {"status": "ok"}

@app.post("/extract-cv")
async def extract_cv(
    file: UploadFile = File(...)
):

    try:

        pdf_bytes = await file.read()

        reader = PdfReader(
            BytesIO(pdf_bytes)
        )

        text = ""

        for page in reader.pages:

            extracted = page.extract_text()

            if extracted:

                text += extracted + "\n"

        candidate = extract_cv_data(text)

        with open(DB_FILE, "r") as f:
            data = json.load(f)

        duplicate = False

        for c in data:

            if (
                c.get("email")
                and candidate.get("email")
                and c["email"] == candidate["email"]
            ):

                c.update(candidate)

                duplicate = True
                break

        if not duplicate:

            candidate["id"] = len(data) + 1

            data.append(candidate)

        with open(DB_FILE, "w") as f:

            json.dump(
                data,
                f,
                indent=4
            )

        return candidate

    except Exception as e:

        print(f"Upload error: {e}")

        return {
            "error": "Invalid or corrupted PDF"
        }


@app.post("/upload-multiple")
async def upload_multiple(
    files: List[UploadFile] = File(...)
):

    with open(DB_FILE,"r") as f:
        data=json.load(f)

    uploaded=[]
    skipped=[]

    for file in files:

        try:

            pdf_bytes=await file.read()

            reader=PdfReader(
                BytesIO(pdf_bytes)
            )

            text=""

            for page in reader.pages:

                extracted=page.extract_text()

                if extracted:
                    text += extracted+"\n"

            candidate=extract_cv_data(text)

            duplicate=False

            for c in data:

                if(
                    c.get("email")
                    and
                    candidate.get("email")
                    and
                    c["email"]==candidate["email"]
                ):

                    c.update(candidate)

                    duplicate=True
                    break

            if not duplicate:

                candidate["id"]=len(data)+1

                data.append(candidate)

            uploaded.append(
                file.filename
            )

        except Exception as e:

            print(
                f"Error in {file.filename}: {e}"
            )

            skipped.append(
                file.filename
            )

    with open(DB_FILE,"w") as f:

        json.dump(
            data,
            f,
            indent=4
        )

    return {

        "message":"Upload complete",
        "uploaded":uploaded,
        "skipped":skipped,
        "count":len(uploaded)

   
    }

    
@app.get("/candidates")
def get_candidates():

    with open(DB_FILE,"r") as f:

        candidates=json.load(f)

    output=[]

    for i,candidate in enumerate(
        candidates,
        start=1
    ):

        item=candidate.copy()

        item["number"]=i

        item.pop(
            "id",
            None
        )

        output.append(item)

    return output


@app.get("/search")
def search(query:str):

    with open(DB_FILE,"r") as f:

        candidates=json.load(f)

    q=query.strip().lower()

    results=[]

    for candidate in candidates:

        name=candidate.get(
            "candidate_name",
            ""
        ).lower()

        skills=candidate.get(
            "skills",
            []
        )

        skill_match=any(

            q in skill.lower()

            for skill in skills

        )

        name_match=q in name

        if skill_match or name_match:

            results.append(
                candidate
            )

    numbered=[]

    for i,candidate in enumerate(
        results,
        start=1
    ):

        item=candidate.copy()

        item["number"]=i

        item.pop(
            "id",
            None
        )

        numbered.append(item)

    return numbered
@app.get("/download-match-doc")
def download_match_doc():

    if not os.path.exists(
        "matched_results.json"
    ):

        return {
            "error":"Run Match Job first"
        }

    with open(
        "matched_results.json",
        "r"
    ) as f:

        candidates=json.load(f)

    doc=Document()

    doc.add_heading(
        "Matched Candidates Report",
        level=1
    )

    for index, c in enumerate(
        candidates,
        start=1
    ):

        doc.add_heading(
            f"{index}. {c.get('candidate_name','N/A')}",
            level=2
        )

        doc.add_paragraph(
            f"Match Score: {c.get('job_match_score',0)}%"
        )

        doc.add_paragraph(
            "Matched Skills: " +
            ", ".join(
                c.get(
                    "matched_skills",
                    []
                )
            )
        )

        doc.add_paragraph(
            "AI Summary: " +
            str(
                c.get(
                    "summary",
                    ""
                )
            )
        )

    filename="results.docx"

    doc.save(
        filename
    )

    return FileResponse(
        filename,
        filename="results.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
@app.get("/download-match-pdf")
def download_match_pdf():

    if not os.path.exists(
        "matched_results.json"
    ):

        return {
            "error":"Run Match Job first"
        }

    with open(
        "matched_results.json",
        "r"
    ) as f:

        candidates=json.load(f)

    pdf_file="results.pdf"

    doc=SimpleDocTemplate(
        pdf_file
    )

    stylesheet=styles.getSampleStyleSheet()

    normal=stylesheet["Normal"]

    title=stylesheet["Title"]

    story=[]

    story.append(
        Paragraph(
            "Matched Candidates Report",
            title
        )
    )

    story.append(
        Spacer(1,20)
    )

    for index, c in enumerate(
        candidates,
        start=1
    ):

        story.append(
            Paragraph(
                f"{index}. Name: {c.get('candidate_name','N/A')}",
                normal
            )
        )

        story.append(
            Paragraph(
                f"Match Score: {c.get('job_match_score',0)}%",
                normal
            )
        )

        story.append(
            Paragraph(
                "Matched Skills: " +
                ", ".join(
                    c.get(
                        "matched_skills",
                        []
                    )
                ),
                normal
            )
        )

        story.append(
            Paragraph(
                "AI Summary: " +
                str(
                    c.get(
                        "summary",
                        ""
                    )
                ),
                normal
            )
        )

        story.append(
            Spacer(1,15)
        )

    doc.build(
        story
    )

    return FileResponse(
        pdf_file,
        filename="results.pdf",
        media_type="application/pdf"
    )

@app.get("/export-csv")
def export_csv():

    with open(DB_FILE,"r") as f:

        candidates=json.load(f)

    wb=Workbook()

    ws=wb.active

    ws.title="candidates"

    ws.append([

        "Name",
        "Email",
        "Phone",
        "Skills",
        "Education",
        "Experience",
        "Score"

    ])

    for c in candidates:

        ws.append([

            c.get(
                "candidate_name",
                ""
            ),

            c.get(
                "email",
                ""
            ),

            c.get(
                "phone",
                ""
            ),

            " | ".join(
                c.get(
                    "skills",
                    []
                )
            ),

            " | ".join(
                c.get(
                    "education",
                    []
                )
            ),

            str(
                c.get(
                    "years_experience",
                    0
                )
            )+" years",

            c.get(
                "score",
                0
            )

        ])

    ws.column_dimensions["A"].width=25
    ws.column_dimensions["B"].width=35
    ws.column_dimensions["C"].width=20
    ws.column_dimensions["D"].width=50
    ws.column_dimensions["E"].width=35
    ws.column_dimensions["F"].width=15
    ws.column_dimensions["G"].width=10

    wb.save(
        "candidates.xlsx"
    )

    return FileResponse(

        "candidates.xlsx",

        filename="candidates.xlsx",

        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    )
@app.get("/export-pdf")
def export_pdf():

    with open(DB_FILE,"r") as f:
        candidates=json.load(f)

    pdf_file="candidates.pdf"

    doc=SimpleDocTemplate(
        pdf_file
    )

    stylesheet=styles.getSampleStyleSheet()

    normal=stylesheet["Normal"]
    title=stylesheet["Title"]

    story=[]

    story.append(
        Paragraph(
            "Candidates Report",
            title
        )
    )

    story.append(
        Spacer(1,20)
    )

    for index, c in enumerate(
        candidates,
        start=1
    ):

        story.append(
            Paragraph(
                f"{index}. {c.get('candidate_name','N/A')}",
                normal
            )
        )

        story.append(
            Paragraph(
                f"Email: {c.get('email','')}",
                normal
            )
        )

        story.append(
            Paragraph(
                "Skills: " +
                ", ".join(
                    c.get(
                        "skills",
                        []
                    )
                ),
                normal
            )
        )

        story.append(
            Spacer(1,15)
        )

    doc.build(story)

    return FileResponse(
        pdf_file,
        filename="candidates.pdf",
        media_type="application/pdf"
    )

@app.post("/match-job")
def match_job(
    description:str
):

    with open(
        DB_FILE,
        "r"
    ) as f:

        candidates=json.load(f)

    required_skills=extract_job_skills(
        description
    )

    results=[]

    for candidate in candidates:

        result=calculate_match_score(

            candidate.get(
                "skills",
                []
            ),

            required_skills

        )

        candidate_copy=candidate.copy()

        candidate_copy[
            "job_match_score"
        ]=result["score"]

        candidate_copy[
            "matched_skills"
        ]=result["matched"]

        candidate_copy[
            "missing_skills"
        ]=result["missing"]

        candidate_copy[
            "related_skills"
        ]=result["related"]

        candidate_copy[
            "comments"
        ]=result["comments"]

        candidate_copy[
            "summary"
        ]=generate_summary(
            candidate
        )

        results.append(
            candidate_copy
        )

    results=sorted(

        results,

        key=lambda x:
        x["job_match_score"],

        reverse=True

    )

    # save matched results for PDF download
    with open(
        "matched_results.json",
        "w"
    ) as f:

        json.dump(
            results,
            f,
            indent=4
        )

    return {

        "required_skills":
        required_skills,

        "ranked_candidates":
        results

    }

@app.delete(
"/reset_session"
)
def reset_session():

    with open(
        DB_FILE,
        "w"
    ) as f:

        json.dump(
            [],
            f
        )

    return {

        "message":
        "Session cleared successfully"

    }


@app.get("/total-uploads")
def total_uploads():

    with open(DB_FILE,"r") as f:
        data=json.load(f)

    return {

        "total_uploads": len(data),
        "total_candidates": len(data)

    }
   
