export type CardMode = 'unclaimed' | 'owner' | 'neighbor' | 'buyer';

export interface UnclaimedNote {
    id: string;
    property_id: string;
    user_id: string; // The person who left the note
    content: string;
    created_at: string;
    status: 'pending' | 'read' | 'archived';
    // potential future fields
    contact_email?: string;
    contact_phone?: string;
}

export interface MessageThread {
    id: string;
    property_id: string;
    participants: string[]; // user_ids
    state: 'open' | 'locked' | 'talking';
    last_message_at: string;
    created_at: string;
    // If we need to link it to a specific potential buyer/neighbor interaction
    context_type?: 'inquiry' | 'neighbor_chat';
}

export interface AlbumShare {
    id: string;
    property_id: string;
    shared_by: string; // owner_id
    shared_with: string; // user_id (or null for public link?) assuming specific user for now
    token: string; // for access control
    expires_at?: string;
    created_at: string;
    view_count: number;
}
