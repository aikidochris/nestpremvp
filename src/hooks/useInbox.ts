import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'

type MessageRow = {
  id: string
  property_id: string
  sender_id: string
  receiver_id: string | null
  content: string
  status: string | null
  thread_id?: string | null
  created_at: string
}

type PropertyLabelLookup = Record<string, string>
type PartnerProfiles = Record<string, { display_name: string | null; email: string | null }>

export type Thread = {
  threadKey: string
  propertyId: string
  partnerId: string | null
  latestMessage: MessageRow
  unreadCount: number
  messages: MessageRow[]
  propertyLabel: string
}

export function useInbox(currentUserId: string | null) {
  const supabase = getSupabaseClient()
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [propertyLabels, setPropertyLabels] = useState<PropertyLabelLookup>({})
  const [loading, setLoading] = useState(false)
  const [partnerProfiles, setPartnerProfiles] = useState<PartnerProfiles>({})

  const fetchProps = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return
      const { data, error } = await supabase
        .from('properties')
        .select('id, street, house_number, postcode')
        .in('id', ids)

      if (error || !data) {
        console.error('useInbox: property fetch error', error)
        return
      }

      const lookup: PropertyLabelLookup = {}
      data.forEach((p: any) => {
        const label = [p.house_number, p.street, p.postcode].filter(Boolean).join(' ').trim()
        lookup[p.id] = label || 'Unknown Property'
      })
      setPropertyLabels((prev) => ({ ...prev, ...lookup }))
    },
    [supabase]
  )

  const fetchMessages = useCallback(async () => {
    if (!currentUserId) {
      setMessages([])
      return
    }
    setLoading(true)

    // Rely on RLS: returns messages I can read (sent, received, or linked to my claimed property)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })

    if (error || !data) {
      console.error('useInbox: message fetch error', error)
      setMessages([])
      setLoading(false)
      return
    }

    // Ensure we normalize to content key even if backend returns body
    const normalized = (data as any[]).map((m) => ({
      ...m,
      content: m.content ?? m.body ?? '',
    }))

    setMessages(normalized as MessageRow[])
    setLoading(false)

    // Fetch partner profiles (exclude self)
    const partnerIds = new Set<string>()
    ;(normalized as any[]).forEach((m) => {
      if (m.sender_id && m.sender_id !== currentUserId) partnerIds.add(m.sender_id)
      if (m.receiver_id && m.receiver_id !== currentUserId) partnerIds.add(m.receiver_id)
    })
    const uniqueIds = Array.from(partnerIds)

    if (!uniqueIds.length) {
      setPartnerProfiles({})
      return
    }

    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, id, display_name, email')
        .in('user_id', uniqueIds)

      if (profileError) {
        console.error('useInbox: profiles fetch error', profileError)
      } else if (profiles) {
        const lookup: PartnerProfiles = {}
        profiles.forEach((p: any) => {
          const key = p.user_id ?? p.id
          if (!key) return
          lookup[key] = { display_name: p.display_name ?? null, email: p.email ?? null }
        })
        setPartnerProfiles((prev) => ({ ...prev, ...lookup }))
      }
    } catch (profileErr) {
      console.error('useInbox: profiles fetch failure', profileErr)
    }
  }, [currentUserId, supabase])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    const ids = Array.from(new Set(messages.map((m) => m.property_id)))
    if (ids.length) fetchProps(ids)
  }, [fetchProps, messages])

  const threads: Thread[] = useMemo(() => {
    if (!currentUserId) return []

    // First pass: capture owner IDs per property (where I am receiver)
    const propertyOwnerMap: Record<string, string> = {}
    messages.forEach((msg) => {
      if (msg.receiver_id === currentUserId && msg.sender_id) {
        propertyOwnerMap[msg.property_id] = msg.sender_id
      }
    })

    const grouped: Record<string, MessageRow[]> = {}

    messages.forEach((msg) => {
      let partnerId: string | null = null
      if (msg.receiver_id === null) {
        // Honey pot: if owner replied later, merge to owner; otherwise keep future owner bucket
        const mappedOwner = propertyOwnerMap[msg.property_id]
        if (mappedOwner) {
          partnerId = mappedOwner
        } else {
          partnerId = msg.sender_id === currentUserId ? null : msg.sender_id
        }
      } else if (msg.sender_id === currentUserId) {
        partnerId = msg.receiver_id
      } else if (msg.receiver_id === currentUserId) {
        partnerId = msg.sender_id
      }
      const key = `${msg.property_id}::${partnerId ?? 'unclaimed'}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(msg)
    })

    return Object.entries(grouped)
      .map(([threadKey, msgs]) => {
        const sortedAsc = [...msgs].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        const latest = sortedAsc[sortedAsc.length - 1]
        let partnerId: string | null = null
        if (latest.receiver_id === null) {
          const mappedOwner = propertyOwnerMap[latest.property_id]
          if (mappedOwner) {
            partnerId = mappedOwner
          } else {
            partnerId = latest.sender_id === currentUserId ? null : latest.sender_id
          }
        } else if (latest.sender_id === currentUserId) {
          partnerId = latest.receiver_id
        } else if (latest.receiver_id === currentUserId) {
          partnerId = latest.sender_id
        }
        const unreadCount = sortedAsc.filter(
          (m) => (m.status === 'unread' || m.status === 'pending_request') && m.receiver_id === currentUserId
        ).length
        const propertyLabel = propertyLabels[latest.property_id] ?? latest.property_id

        return {
          threadKey,
          propertyId: latest.property_id,
          partnerId,
          latestMessage: latest,
          unreadCount,
          messages: sortedAsc,
          propertyLabel,
        }
      })
      .sort(
        (a, b) =>
          new Date(b.latestMessage.created_at).getTime() - new Date(a.latestMessage.created_at).getTime()
      )
  }, [currentUserId, messages, propertyLabels])

  const sendMessage = useCallback(
    async (propertyId: string, body: string, receiverId?: string | null, status: string = 'unread') => {
      if (!currentUserId) throw new Error('No current user')
      const payload = {
        property_id: propertyId,
        sender_id: currentUserId,
        receiver_id: receiverId ?? null,
        content: body,
        status,
        thread_id: crypto.randomUUID(),
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(payload)
        .select('*')
        .single()

      if (error || !data) {
        console.error('useInbox sendMessage error', error)
        throw error
      }

      await fetchMessages()
      return data as MessageRow
    },
    [currentUserId, fetchMessages, supabase]
  )

  const markThreadRead = useCallback(
    async (propertyId: string, partnerId: string | null) => {
      if (!currentUserId) return
      const { error } = await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('property_id', propertyId)
        .eq('receiver_id', currentUserId)
        .neq('status', 'read')

      if (error) {
        console.error('useInbox: markThreadRead error', error)
        return
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.property_id === propertyId && m.receiver_id === currentUserId
            ? { ...m, status: 'read' }
            : m
        )
      )
    },
    [currentUserId, supabase]
  )

  return { threads, loading, partnerProfiles, sendMessage, markThreadRead }
}
