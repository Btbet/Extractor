import re


SKILL_KEYWORDS = [

    "Python",
    "Java",
    "JavaScript",
    "SQL",
    "Machine Learning",
    "Data Science",
    "Data Analytics",
    "Data Analysis",
    "AI",
    "Deep Learning",
    "TensorFlow",
    "PyTorch",
    "Excel",
    "Power BI",
    "Tableau",
    "Cloud Computing",
    "AWS",
    "Azure",
    "Docker",
    "Git",
    "Leadership",
    "CRM",
    "Business Development",
    "Communication",
    "Teaching",
    "Marketing",
    "Accounting"

]


EDUCATION_WORDS = [

    "Computer Science",
    "Software Engineering",
    "Information Technology",
    "Data Science",
    "Machine Learning",
    "Computer Engineering",
    "Business Administration",
    "Accounting",
    "Economics",
    "BSc",
    "MSc",
    "Bachelor",
    "Master",
    "PhD"

]


def clean_text(text):

    text = re.sub(
        r'[ \t]+',
        ' ',
        text
    )

    return text.strip()


def extract_name(text):

    lines = text.split("\n")

    for line in lines[:10]:

        line = line.strip()

        if not line:
            continue

        words = line.split()

        if (

            len(words) >= 2 and
            len(words) <= 5 and

            all(
                w.replace(".", "").isalpha()
                for w in words
            ) and

            not any(

                x.lower() in line.lower()

                for x in [

                    "email",
                    "@",
                    "phone",
                    "experience",
                    "education",
                    "skills",
                    "university",
                    "address",
                    "gmail",
                    ".com"

                ]
            )

        ):

            return line

    return "Unknown"


def extract_email(text):

    match = re.search(

        r'[\w\.-]+@[\w\.-]+\.\w+',

        text

    )

    return match.group() if match else None


def extract_phone(text):

    phones = re.findall(

        r'(?:\+?\d[\d\s\-]{7,15}\d)',

        text

    )

    for phone in phones:

        clean = re.sub(
            r'\D',
            '',
            phone
        )

        if len(clean) >= 10:

            return phone.strip()

    return None


def extract_skills(text):

    skills=[]

    skill_section = re.search(

        r'Skills(.*?)(Experience|Education|$)',

        text,

        re.I | re.S

    )

    if skill_section:

        content=skill_section.group(1)

        lines=content.split("\n")

        for line in lines:

            line=line.strip("•- ")

            if len(line)>2:

                skills.append(line)

    for skill in SKILL_KEYWORDS:

        if re.search(

            r'\b'+re.escape(skill)+r'\b',

            text,

            re.I

        ):

            skills.append(skill)

    skills=list(dict.fromkeys(skills))

    return skills[:15]


def extract_education(text):

    education=[]

    for edu in EDUCATION_WORDS:

        if re.search(

            r'\b'+re.escape(edu)+r'\b',

            text,

            re.I

        ):

            education.append(edu)

    education=list(dict.fromkeys(education))

    return education


def extract_experience(text):

    years=re.findall(

        r'(20\d{2})',

        text

    )

    years=[int(y) for y in years]

    years.sort()

    if len(years)>=2:

        return max(years)-min(years)

    return 1


def calculate_score(data):

    score=0

    score += min(

        len(
            data["skills"]
        )*10,

        40

    )

    score += min(

        len(
            data["education"]
        )*10,

        30

    )

    score += min(

        data["years_experience"]*5,

        30

    )

    return score


def extract_cv_data(text):

    cleaned = clean_text(text)

    candidate={

        "candidate_name":
        extract_name(text),

        "email":
        extract_email(cleaned),

        "phone":
        extract_phone(cleaned),

        "skills":
        extract_skills(text),

        "education":
        extract_education(cleaned),

        "years_experience":
        extract_experience(cleaned)

    }

    candidate["score"]=calculate_score(
        candidate
    )

    return candidate