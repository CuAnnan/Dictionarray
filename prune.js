const fs=require('fs');
let words = [];
const filecontents = fs.readFileSync('./dict.txt', 'utf-8');
filecontents.split(/\r?\n/).forEach(line=>{
    let tLine = line.trim();
    if(tLine.length === 5)
    {
        words.push(tLine.toUpperCase());
    }
});
fs.writeFile('dict.json',JSON.stringify(words),'utf8',()=>{console.log('done');});