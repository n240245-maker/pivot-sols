import { useMemo, useState } from 'react'
import { useContent } from '../contexts/ContentContext'
import type { InformationRoom } from '../types/content'

export function filterRooms(rooms: readonly InformationRoom[], query: string, floor: string) {
  const term = query.trim().toLocaleLowerCase()
  return rooms.filter(room => (!floor || room.floor === floor) &&
    [room.name, room.room_number, room.phone_number, room.floor]
      .some(value => value.toLocaleLowerCase().includes(term)))
}

export function RoomsPage() {
  const { data } = useContent()
  const [query, setQuery] = useState('')
  const [floor, setFloor] = useState('')
  const [copyFeedback, setCopyFeedback] = useState('')
  const floors = [...new Set(data.rooms.map(room => room.floor).filter(Boolean))].sort()
  const rooms = useMemo(() => filterRooms(data.rooms, query, floor), [data.rooms, floor, query])
  return <div className="discovery-page"><header className="directory-heading"><p className="pivot-eyebrow">I3 Block</p><h1>Important Offices &amp; Rooms</h1><p>Find published room and contact information.</p></header>
    <div className="directory-filters"><label>Search rooms<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Office, room, phone or floor" /></label><label>Floor<select value={floor} onChange={event => setFloor(event.target.value)}><option value="">All floors</option>{floors.map(item => <option key={item}>{item}</option>)}</select></label></div>
    {copyFeedback&&<p role="status">{copyFeedback}</p>}{rooms.length ? <div className="directory-grid">{rooms.map(room => <article className="directory-card" key={room.id}><h2>{room.name}</h2><p><strong>Room:</strong> {room.room_number}</p><p><strong>Phone:</strong> {room.phone_number}</p>{room.floor && <p><strong>Floor:</strong> {room.floor}</p>}{room.description && <p>{room.description}</p>}<div className="directory-actions"><a href={`tel:${room.phone_number.replace(/[^\d+]/g, '')}`}>Call</a><button type="button" onClick={() => void navigator.clipboard.writeText(room.phone_number).then(()=>setCopyFeedback('Phone number copied.')).catch(()=>setCopyFeedback('Copy is unavailable. Select the phone number above.'))}>Copy phone number</button></div></article>)}</div>
      : <div className="content-state"><h2>{query || floor ? 'No matching rooms' : 'No room information has been published yet.'}</h2></div>}</div>
}
