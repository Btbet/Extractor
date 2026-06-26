document.addEventListener("DOMContentLoaded", function () {
    console.log("Dashboard Loaded");

    loadStats();
    loadCandidates();
    checkAPI();

    // Check API every 10 seconds
    setInterval(checkAPI, 10000);

    // Fast LED animation
    setInterval(animateIndicator, 100);
});
let currentCandidates = [];
let selectedCVs = [];
let currentPage = 1;
const pageSize = 10;
let totalPages = 1;
let apiLive = false;

const liveColors = [
    "#22c55e",
    "#2563eb",
    "#facc15"
];

let colorIndex = 0;

async function loadStats() {
    try {
        let response = await fetch("/total-uploads");
        let data = await response.json();

        document.getElementById("uploads").innerText =
            data.total_uploads || 0;

        document.getElementById("candidates").innerText =
            data.total_candidates || 0;

    } catch (err) {
        console.error("Stats Error:", err);
    }
}

function animateIndicator() {

    if (!apiLive) return;

    const indicator =
        document.getElementById("liveIndicator");

    const statusElement =
        document.getElementById("apiStatus");

    if (!indicator || !statusElement) return;

    indicator.style.background =
        liveColors[colorIndex];

    indicator.style.boxShadow =
        `0 0 25px ${liveColors[colorIndex]}`;

    statusElement.style.color =
        liveColors[colorIndex];

    colorIndex =
        (colorIndex + 1) %
        liveColors.length;
}

async function checkAPI() {

    const statusElement =
        document.getElementById("apiStatus");

    const indicator =
        document.getElementById("liveIndicator");

    try {

        let response =
            await fetch("/health");

        if (response.ok) {

            apiLive = true;

            statusElement.innerText =
                "Live";

            if (indicator) {
                indicator.style.display =
                    "inline-block";
            }

        } else {

            apiLive = false;

            statusElement.innerText =
                "Offline";

            statusElement.style.color =
                "red";

            if (indicator) {
                indicator.style.display =
                    "none";
            }
        }

    } catch (err) {

        apiLive = false;

        statusElement.innerText =
            "Offline";

        statusElement.style.color =
            "red";

        if (indicator) {
            indicator.style.display =
                "none";
        }

        console.error(err);
    }
}

async function uploadSingle(){

    let fileInput =
        document.getElementById("singleCV");

    let file =
        fileInput.files[0];

    if(!file){

        document.getElementById(
            "singleResult"
        ).innerHTML = `
            <p style="
                color:red;
                font-weight:bold;
            ">
            ⚠ Select a CV
            </p>
        `;

        return;
    }

    let form = new FormData();

    form.append(
        "file",
        file
    );

    try{

        let response =
            await fetch(
                "/extract-cv",
                {
                    method:"POST",
                    body:form
                }
            );

        let data =
            await response.json();

        if(data.status === "success"){

            let c = data.candidate;

            document.getElementById(
                "singleResult"
            ).innerHTML = `
                <p style="
                    color:green;
                    font-weight:bold;
                    margin-bottom:10px;
                ">
                ✅ CV Uploaded Successfully
                </p>

                <h3>${c.name || ""}</h3>

                <p>${c.email || ""}</p>
            `;

            loadStats();

            loadCandidates();

        }

        else if(data.status === "duplicate"){

            document.getElementById(
                "singleResult"
            ).innerHTML = `
                <p style="
                    color:orange;
                    font-weight:bold;
                ">
                ⚠ Duplicate CV detected
                </p>
            `;

        }

        else if(data.status === "rejected"){

            document.getElementById(
                "singleResult"
            ).innerHTML = `
                <p style="
                    color:red;
                    font-weight:bold;
                ">
                ❌ Invalid CV or Resume
                </p>
            `;

        }

        fileInput.value = "";

        setTimeout(() => {

            document.getElementById(
                "singleResult"
            ).innerHTML = "";

        }, 5000);

    }

    catch(err){

        console.log(err);

        fileInput.value = "";

    }

}
function addCV(){

    let files =
        document.getElementById(
            "multipleCV"
        ).files;

    if(files.length===0){

        document.getElementById(
            "selectedFiles"
        ).innerHTML = `
        <p style="
        color:red;
        font-weight:bold;
        ">
        Select files first
        </p>
        `;

        return;
    }

    for(
        let i=0;
        i<files.length;
        i++
    ){

        selectedCVs.push(
            files[i]
        );

    }

    document.getElementById(
        "multipleCV"
    ).value = "";

    showSelectedFiles();
}

function showSelectedFiles(){

    let html = "";

    selectedCVs.forEach(

        (file,index)=>{

            html += `
            <div style="
                background:#dbeafe;
                padding:10px;
                margin:5px;
                border-radius:8px;
                display:flex;
                justify-content:space-between;
                align-items:center;
            ">
                <span>${file.name}</span>

                <button
                    onclick="removeCV(${index})"
                    style="
                        background:#dc2626;
                        color:white;
                        border:none;
                        padding:5px 10px;
                        border-radius:5px;
                    ">
                    X
                </button>
            </div>
            `;
        }
    );

    document.getElementById(
        "selectedFiles"
    ).innerHTML = html;
}

function removeCV(index){

    selectedCVs.splice(index, 1);

    showSelectedFiles();
}
async function uploadMultiple(){

    if(selectedCVs.length === 0){

        document.getElementById(
            "selectedFiles"
        ).innerHTML = `
        <p style="
            color:red;
            font-weight:bold;
            padding:10px;
        ">
        ⚠ No files selected
        </p>
        `;

        return;
    }

    let form = new FormData();

    selectedCVs.forEach(file => {

        form.append(
            "files",
            file
        );

    });

    try{

        let response =
            await fetch(
                "/upload-multiple",
                {
                    method:"POST",
                    body:form
                }
            );

        let data =
            await response.json();

        if(!response.ok){

            document.getElementById(
                "selectedFiles"
            ).innerHTML = `
            <p style="
                color:red;
                font-weight:bold;
                padding:10px;
            ">
            ❌ Upload Failed
            </p>
            `;

            return;
        }

        document.getElementById(
            "selectedFiles"
        ).innerHTML = `
        <p style="
            color:green;
            font-weight:bold;
            padding:10px;
        ">
        ✅ ${data.count} CV(s) uploaded successfully
        </p>

        <p>
            Uploaded: ${data.uploaded.length}<br>
            Skipped: ${data.skipped.length}
        </p>
        `;

        // Clear stored files
        selectedCVs = [];

        // Clear file input
        document.getElementById(
            "multipleCV"
        ).value = "";

        loadStats();

        loadCandidates();

        setTimeout(() => {

            document.getElementById(
                "selectedFiles"
            ).innerHTML = "";

        }, 6000);

    }

    catch(err){

        console.log(err);

        document.getElementById(
            "selectedFiles"
        ).innerHTML = `
        <p style="
            color:red;
            font-weight:bold;
            padding:10px;
        ">
        ❌ Upload Failed
        </p>
        `;

        setTimeout(() => {

            document.getElementById(
                "selectedFiles"
            ).innerHTML = "";

        }, 5000);

    }
}

async function loadCandidates() {

    try {

        const response = await fetch(
            `/candidates?page=${currentPage}&limit=${pageSize}`
        );

        const data = await response.json();

        currentCandidates = data.candidates || [];
        totalPages = data.pages || 1;

        let html = "";

        currentCandidates.forEach((c, index) => {

            html += `
            <tr>

                <td>${c.number || index + 1}</td>

                <td>
                    <strong>${c.name || "Unknown"}</strong><br>
                    <small>${c.email || ""}</small>
                </td>

                <td>
                    ${(c.skills || [])
                        .slice(0,3)
                        .map(skill =>
                            `<span class="skill">${skill}</span>`
                        ).join(" ")}
                </td>

                <td>
                    ${c.years_experience || 0} yrs
                </td>

                <td>
                    <button
                        class="load-btn"
                        onclick="viewCandidate(${index})">
                        View
                    </button>
                </td>

            </tr>
            `;

        });

        document.getElementById("candidateTable").innerHTML = html;

        document.getElementById("pageNumber").innerText =
            `Page ${currentPage} of ${totalPages}`;

    }

    catch(err){

        console.log(err);

    }

}

let selectedCandidate = null;

function nextPage() {

if (currentPage < totalPages) {

    currentPage++;

    loadCandidates();

}

}

function previousPage() {

if (currentPage > 1) {

    currentPage--;

    loadCandidates();

}

}

function viewCandidate(index){

    const c = currentCandidates[index];

    if(!c) return;

    selectedCandidate = c;

    document.getElementById("modalName").textContent =
        c.name || "N/A";

    document.getElementById("modalEmail").textContent =
        c.email || "N/A";

    document.getElementById("modalEducation").innerHTML =
        (c.education || []).join("<br>");

    document.getElementById("modalExperience").textContent =
        `${c.years_experience || 0} years`;

    document.getElementById("modalMatch").textContent =
        `${c.job_match_score || 0}%`;

    document.getElementById("modalSkills").innerHTML =
        (c.skills || [])
        .map(skill =>
            `<span class="skill">${skill}</span>`
        )
        .join(" ");

    document.getElementById("modalSummary").textContent =
        c.summary || "No summary available.";

    document.getElementById("candidateModal").style.display =
        "block";

}

function downloadCandidatePDF() {

if (!selectedCandidate) {
    alert("No candidate selected");
    return;
}

const { jsPDF } = window.jspdf;

const pdf = new jsPDF();

let y = 20;

pdf.setFontSize(18);
pdf.text("Candidate Profile", 20, y);

y += 15;

pdf.setFontSize(12);

pdf.text(
    `Name: ${selectedCandidate.name || "N/A"}`,
    20,
    y
);

y += 10;

pdf.text(
    `Email: ${selectedCandidate.email || "N/A"}`,
    20,
    y
);

y += 10;

pdf.text(
    `Phone: ${selectedCandidate.phone || "N/A"}`,
    20,
    y
);

y += 10;

pdf.text(
    `Experience: ${selectedCandidate.years_experience || 0} years`,
    20,
    y
);

y += 15;

pdf.text("Education:", 20, y);

y += 10;

(selectedCandidate.education || []).forEach(item => {

    const cleanItem = String(item)
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    pdf.text("- " + cleanItem, 25, y);

    y += 8;
});

y += 5;

pdf.text("Skills:", 20, y);

y += 10;

(selectedCandidate.skills || []).forEach(skill => {

    const cleanSkill = String(skill)
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const skillLines = pdf.splitTextToSize(
        "- " + cleanSkill,
        160
    );

    pdf.text(skillLines, 25, y);

    y += (skillLines.length * 7);
});

y += 10;

pdf.text("AI Summary:", 20, y);

y += 10;

const cleanSummary = String(
    selectedCandidate.summary || ""
)
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const summaryLines = pdf.splitTextToSize(
    cleanSummary,
    170
);

pdf.text(summaryLines, 20, y);

pdf.save(
    `${selectedCandidate.name || "candidate"}_profile.pdf`
);

}
function closeModal(){

document.getElementById(
"candidateModal"
).style.display =
"none";

}

window.addEventListener(
"click",
function(event){

const modal =
document.getElementById(
"candidateModal"
);

if(event.target === modal){

modal.style.display =
"none";

}

});

async function searchCandidate(){

    const q = document.getElementById("searchText").value;

    try{

        const response =
            await fetch(`/search?query=${encodeURIComponent(q)}`);

        const data = await response.json();

        currentCandidates = data;

        let html = "";

        data.forEach((c,index)=>{

            html += `
            <tr>

                <td>${index+1}</td>

                <td>
                    <strong>${c.name || ""}</strong><br>
                    <small>${c.email || ""}</small>
                </td>

                <td>
                    ${(c.skills || [])
                        .slice(0,3)
                        .map(skill =>
                            `<span class="skill">${skill}</span>`
                        ).join(" ")}
                </td>

                <td>
                    ${c.years_experience || 0} yrs
                </td>

                <td>
                    ${c.job_match_score || 0}%
                </td>

                <td>
                    <button
                        class="load-btn"
                        onclick="viewCandidate(${index})">
                        View
                    </button>
                </td>

            </tr>
            `;

        });

        document.getElementById("candidateTable").innerHTML = html;

    }

    catch(err){

        console.log(err);

    }

}



function clearSearch(){

document.getElementById(
"searchText"
).value="";

loadCandidates();

}



async function matchJob(){

let description=
document.getElementById(
"jobDescription"
).value;

try{

let response=
await fetch(
"/match-job?description="+
description,
{
method:"POST"
}
);

let data=
await response.json();

let html="";

data.ranked_candidates
.slice(0,5)
.forEach(

(c,index)=>{

html+=`

<div class="card">

<h3>
${index+1}. ${c.name}
</h3>

<p>
Match Score:
<b>
${c.job_match_score}%
</b>
</p>

<p>
Matched Skills:
${c.matched_skills}
</p>

<p>
AI Summary:
${c.summary}
</p>

</div>

`;

}

);

document.getElementById(
"matchResults"
).innerHTML=html;

document.getElementById(
"downloadSection"
).style.display=
"block";

}

catch(err){

console.log(err);

alert(
"Match failed"
);

}

}



function clearMatch(){

document.getElementById(
"jobDescription"
).value="";

document.getElementById(
"matchResults"
).innerHTML="";

document.getElementById(
"downloadSection"
).style.display=
"none";

}



function downloadResults(type){

let content=
document.getElementById(
"matchResults"
).innerText;

if(content===""){

alert(
"No Results"
);

return;

}

let blob=
new Blob(
[content]
);

let link=
document.createElement(
"a"
);

link.href=
URL.createObjectURL(
blob
);

link.download=
type==="pdf"
?
"results.pdf"
:
"results.doc";

link.click();

}
async function resetSession(){

    try{

        await fetch(
            "/reset_session",
            {
                method:"DELETE"
            }
        );

        document.getElementById(
            "matchResults"
        ).innerHTML = `
        <p style="
            color:green;
            font-weight:bold;
        ">
        ✅ Session Cleared
        </p>
        `;

        setTimeout(() => {
            document.getElementById(
                "matchResults"
            ).innerHTML = "";
        }, 7000);

        loadStats();

        loadCandidates();

    }

    catch(err){

        console.log(err);

    }

}
function downloadResults(type){

if(type==="pdf"){

window.location=
"/download-match-pdf";

}

else if(type==="doc"){

window.location=
"/download-match-doc";

}

}
