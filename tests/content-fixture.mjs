// Preserved seed data is an explicit test fixture, never a runtime fallback.
import {loadTypeScript} from './load-typescript.mjs'
const seed = loadTypeScript('src/data/siteContent.ts').seedSiteContent
export const contentFixture = {
  books: loadTypeScript('src/data/demoAcademicResources.ts').demoAcademicResources,
  labs: loadTypeScript('src/data/demoLabResources.ts').demoLabResources,
  domains: loadTypeScript('src/data/careers/domains.ts').careerDomains,
  roles: loadTypeScript('src/data/careers/roles.ts').careerRoles,
  branches: loadTypeScript('src/data/branches/branches.ts').branchGuides,
  rooms: [{id:'room-1',name:'Test Office',room_number:'QA-201',phone_number:'08656-123456',floor:'Second',description:'Test-only room',updated_at:'2026-09-27T00:00:00Z'}],
  faculty_subjects: [{id:'faculty-subject-1',name:'Mathematics',slug:'mathematics'}],
  faculty: [{id:'faculty-1',subject_id:'faculty-subject-1',name:'Test Faculty',designation:'Lecturer',mobile_number:'9876543210',email:'faculty@example.com',room_number:'QA-202',image_url:null}],
  career_resources: [{id:'resource-1',resource_type:'domain',branch_id:'ece',title:'Test VLSI Guide',description:'A test domain resource',pdf_url:'https://example.com/vlsi.pdf',supporting_url:null,youtube_url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',storage_type:'external',tags:['VLSI'],updated_at:'2026-09-27T00:00:00Z'},{id:'resource-2',resource_type:'job',branch_id:'cse',title:'Test Software Job Guide',description:'A test job resource',pdf_url:'https://example.com/software.pdf',supporting_url:null,youtube_url:'https://youtu.be/dQw4w9WgXcQ',storage_type:'object',tags:['Software'],updated_at:'2026-09-27T00:00:00Z'}],
  site: {
    about: {title:seed.about.title,...seed.about.content_json},
    explore: {title:seed.explore.title,...seed.explore.content_json,cards:loadTypeScript('src/config/studentNavigation.ts').resourceDestinations.slice(0,4)},
  },
}
export const contentMocks = Object.fromEntries(['../contexts/ContentContext','../../contexts/ContentContext'].map(path=>[path,{useContent:()=>({data:contentFixture,status:'ready',reload:()=>{}})}]))
