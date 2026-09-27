export type SearchResultType = 'Book' | 'Subject' | 'Lab' | 'Experiment' | 'Career Domain' | 'Career Role' | 'Career Domain Resource' | 'Career Job Resource' | 'I3 Block Room' | 'Faculty Subject' | 'Faculty Member' | 'Branch' | 'Section'
export interface SearchResult { id:string; title:string; type:SearchResultType; context:string; to:string; keywords:string }
