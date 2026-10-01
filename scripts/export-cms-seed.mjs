import {writeFileSync} from 'node:fs'
import {resolve, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {loadTypeScript} from '../tests/load-typescript.mjs'

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '..'))
const site = loadTypeScript('src/data/siteContent.ts').seedSiteContent
site.explore.content_json.cards = loadTypeScript('src/config/studentNavigation.ts').resourceDestinations.slice(0,4).map(({path,title,description})=>({path,title,description}))
const data = {
  books: loadTypeScript('src/data/demoAcademicResources.ts').demoAcademicResources,
  labs: loadTypeScript('src/data/demoLabResources.ts').demoLabResources,
  domains: loadTypeScript('src/data/careers/domains.ts').careerDomains,
  roles: loadTypeScript('src/data/careers/roles.ts').careerRoles,
  branches: loadTypeScript('src/data/branches/branches.ts').branchGuides,
  site,
}
writeFileSync(resolve('backend/seed_content.json'), JSON.stringify(data,null,2)+'\n')
console.log('Exported existing content to backend/seed_content.json; no database changes made.')
