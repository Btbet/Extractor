import re


RELATED_SKILLS={

    "aws":[
        "cloud computing",
        "azure",
        "docker"
    ],

    "machine learning":[
        "ai",
        "deep learning",
        "tensorflow",
        "pytorch",
        "data science"
    ],

    "python":[
        "data analysis",
        "machine learning",
        "ai"
    ],

    "classroom management":[
        "communication",
        "teaching",
        "lesson planning"
    ],

    "sql":[
        "data analytics",
        "data analysis"
    ]
}

def extract_job_skills(job_text):

    text = job_text.lower()

    skills = []

    stop_words = [
# connectors
"and","or","with","for","to","in","on","at",
"of","from","by","as","that","this",

# articles
"a","an","the",

# role words
"developer",
"engineer",
"specialist",
"manager",
"analyst",
"intern",
"consultant",

# experience words
"experience",
"experienced",
"required",
"preferred",
"knowledge",
"understanding",
"skills",
"skill",

# levels
"senior",
"junior",
"mid",
"entry",
"lead",

# hiring words
"hiring",
"looking",
"seeking",
"need",
"wanted",

# action words
"build",
"develop",
"create",
"design",
"manage",
"implement",
"maintain",
"support",
"work",

# generic words
"ability",
"strong",
"good",
"excellent",
"highly",
"motivated",
"professional",
"candidate",
"role",
"position",
"team",
"company"


    ]

    multi_skills = [

        # AI / Data
       

# AI / Data
"machine learning",
"deep learning",
"data science",
"data analytics",
"data analysis",
"natural language processing",
"computer vision",
"predictive modeling",
"artificial intelligence",

# Programming / Software
"web development",
"mobile development",
"backend development",
"frontend development",
"full stack development",
"software engineering",
"api development",
"database management",

# Cloud / DevOps
"cloud computing",
"cloud architecture",
"devops engineering",
"continuous integration",
"continuous deployment",
"version control",
"container orchestration",

# Security
"cyber security",
"network security",
"penetration testing",
"ethical hacking",
"security analysis",

# Business / Management
"business development",
"project management",
"product management",
"customer relationship management",
"risk management",
"financial analysis",
"financial reporting",
"strategic planning",

# Design
"user experience",
"user interface",
"ui design",
"ux design",
"graphic design",
"visual design",
"motion design",

# Marketing
"digital marketing",
"content marketing",
"social media marketing",
"search engine optimization",
"email marketing",

# Education
"classroom management",
"lesson planning",
"curriculum development",
"student engagement",

# Data tools
"data visualization",
"business intelligence",

# Human resources
"talent acquisition",
"employee relations",
"performance management"



    ]


    # detect full phrases first
    for skill in multi_skills:

        if skill in text:

            skills.append(skill)

            text = text.replace(
                skill,
                ""
            )


    words = re.findall(
        r'\b[a-zA-Z]+\b',
        text
    )


    for word in words:

        if (
            len(word) > 2
            and word not in stop_words
        ):

            skills.append(word)


    return list(
        dict.fromkeys(skills)
    )


def calculate_match_score(

    candidate_skills,
    required_skills

):

    matched=[]

    missing=[]

    related=[]

    comments=[]


    candidate_text=" ".join(

        candidate_skills

    ).lower()


    for skill in required_skills:

        skill_clean=skill.lower()


        if skill_clean in candidate_text:

            matched.append(skill)

        else:

            missing.append(skill)

            nearby=RELATED_SKILLS.get(
                skill_clean,
                []
            )

            found=[]

            for item in nearby:

                if item in candidate_text:

                    found.append(
                        item
                    )

            if found:

                related.extend(
                    found
                )

                comments.append(

                    f"{skill} not found directly but candidate has related skills: {', '.join(found)}"

                )


    related=list(
        dict.fromkeys(
            related
        )
    )

    if len(required_skills)==0:

        score=0

    else:

        score=int(

            (

                len(matched)
                +

                len(related)*0.5

            )

            /

            len(required_skills)

            *100

        )


    return {

        "score":score,

        "matched":matched,

        "missing":missing,

        "related":related,

        "comments":comments

    }


def generate_summary(candidate):

    skills = candidate.get("skills", [])

    short_skills = [
        skill.strip()
        for skill in skills
        if len(skill.strip()) < 40
    ][:5]

    years = candidate.get(
        "years_experience",
        0
    )

    return (
        f"{candidate.get('candidate_name', 'Candidate')} "
        f"has {years} years experience "
        f"with skills in {', '.join(short_skills)}."
    )
