export type SearchResultType = 'Book' | 'Subject' | 'Lab' | 'Experiment' | 'Career Domain' | 'Career Role' | 'Branch' | 'Section'
export interface SearchResult { id:string; title:string; type:SearchResultType; context:string; to:string; keywords:string }
