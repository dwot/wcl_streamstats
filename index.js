const { GraphQLClient } = require('graphql-request')
const secrets = require('./secrets')
const fs = require('fs')

require('dotenv').config()
const endpoint = 'https://classic.warcraftlogs.com/api/v2/client'
const WCL_TOKEN = (secrets.read('WCL_TOKEN') || process.env.WCL_TOKEN || '')
const WCL_CHARACTER = (secrets.read('WCL_CHARACTER') || process.env.WCL_CHARACTER || '')
const WCL_SERVER = (secrets.read('WCL_SERVER') || process.env.WCL_SERVER || '')
const WCL_REGION = (secrets.read('WCL_REGION') || process.env.WCL_REGION || '')
const WCL_OUTFILE = (secrets.read('WCL_OUTFILE') || process.env.WCL_OUTFILE || '')

const client = new GraphQLClient(endpoint, {
    headers: {
        authorization: 'Bearer ' + WCL_TOKEN
    }
})
async function getData() {
    const charQuery = `{characterData {character(name:"${WCL_CHARACTER}",serverSlug:"${WCL_SERVER}",serverRegion:"${WCL_REGION}") {id, name, recentReports(limit:1) {total, per_page, last_page, current_page, data {title, rankings}}}}}`
    const charData = await client.request(charQuery)
    let blnFound = false
    let lastFight = null
    while (blnFound == false) {
        lastFight = charData.characterData.character.recentReports.data[0].rankings.data.pop()
        if (lastFight.fightID < 1000 || charData.characterData.character.recentReports.data[0].rankings.data.length == 0) {
            blnFound = true
        }
    }
    let encounter = ''
    let duration = 0
    let dps = 0
    let parse = 0
    let rank = ''
    console.log(`RESULT ${lastFight.encounter.name} DUR: ${lastFight.duration} `)
    for (let entry of lastFight.roles.dps.characters) {
        if (entry.name == 'Dwot') {
            console.log(`Found Ya! DPS: ${entry.amount} Parse: ${entry.rankPercent} Rank: ${entry.rank}`)
            dps = entry.amount
            parse = entry.rankPercent
            rank = entry.rank
            encounter = lastFight.encounter.name
            duration = lastFight.duration
        }
    }

    const content = `${encounter}: ${dps} dps (Rank: ${rank} | Parse: ${parse}) in ${duration / 1000}s`
    fs.writeFile(WCL_OUTFILE, content, err => {
        if (err) {
            console.error(err)
            return
        }
        //file written successfully
    })

}

getData().then(r => console.log(`DONE.`))