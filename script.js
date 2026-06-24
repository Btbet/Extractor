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

let selectedCVs = [];

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

    let form =
        new FormData();

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

        <h3>${data.candidate_name || ""}</h3>

        <p>${data.email || ""}</p>

        `;

        /* clear selected file */
        fileInput.value = "";

        loadStats();
        loadCandidates();

    }

    catch(err){

        console.log(err);

        document.getElementById(
            "singleResult"
        ).innerHTML = `
            <p style="
                color:red;
                font-weight:bold;
            ">
            ❌ Upload Failed
            </p>
        `;
    }
}

async function uploadMultiple(){

if(
selectedCVs.length===0
){

alert(
"No files selected"
);

return;

}

let form=
new FormData();

selectedCVs.forEach(

file=>{

form.append(
"files",
file
);

}

);

try{

let response=
await fetch(
"/upload-multiple",
{
method:"POST",
body:form
}
);

let data=
await response.json();

alert(
`${data.count} uploaded`
);

selectedCVs=[];

showSelectedFiles();

loadStats();

loadCandidates();

}

catch(err){

console.log(err);

alert(
"Upload Failed"
);

}

}



async function loadCandidates(){

try{

let response=
await fetch(
"/candidates"
);

let data=
await response.json();

let html="";

data.forEach(

(c,index)=>{

html+=`

<tr>

<td>${index+1}</td>

<td>${c.candidate_name || ""}</td>

<td>${c.email || ""}</td>

<td>

${(c.skills || [])
.map(
s=>`<span class="skill">${s}</span>`
)
.join("")}

</td>

<td>

${(c.education || [])
.join(", ")}

</td>

<td>

${c.years_experience || 0}
years

</td>

</tr>

`;

}

);

document.getElementById(
"candidateTable"
).innerHTML=html;

}

catch(err){

console.log(err);

}

}



async function searchCandidate(){

let q=
document.getElementById(
"searchText"
).value;

try{

let response=
await fetch(
`/search?query=${q}`
);

let data=
await response.json();

let html="";

data.forEach(

(c,index)=>{

html+=`

<tr>

<td>${index+1}</td>

<td>${c.candidate_name || ""}</td>

<td>${c.email || ""}</td>

<td>

${(c.skills || [])
.map(
s=>`<span class="skill">${s}</span>`
)
.join("")}

</td>

<td>

${(c.education || [])
.join(", ")}

</td>

<td>

${c.years_experience || 0}
years

</td>

</tr>

`;

}

);

document.getElementById(
"candidateTable"
).innerHTML=html;

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
${index+1}. ${c.candidate_name}
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

await fetch(
"/reset_session",
{
method:"DELETE"
}
);

alert(
"Session Cleared"
);

loadStats();

loadCandidates();

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
