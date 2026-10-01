// Preserved seed data is an explicit test fixture, never a runtime fallback.
import {loadTypeScript} from './load-typescript.mjs'
const seed = loadTypeScript('src/data/siteContent.ts').seedSiteContent
export const contentFixture = {
  books: loadTypeScript('src/data/demoAcademicResources.ts').demoAcademicResources,
  labs: loadTypeScript('src/data/demoLabResources.ts').demoLabResources,
  domains: loadTypeScript('src/data/careers/domains.ts').careerDomains,
  roles: loadTypeScript('src/data/careers/roles.ts').careerRoles,
  branches: loadTypeScript('src/data/branches/branches.ts').branchGuides,
  site: {
    about: {title:seed.about.title,...seed.about.content_json},
    explore: {title:seed.explore.title,...seed.explore.content_json,cards:loadTypeScript('src/config/studentNavigation.ts').resourceDestinations.slice(0,4)},
  },
}
export const contentMocks = Object.fromEntries(['../contexts/ContentContext','../../contexts/ContentContext'].map(path=>[path,{useContent:()=>({data:contentFixture,status:'ready',reload:()=>{}})}]))
