import type { Session,SupabaseClient } from "@supabase/supabase-js";

declare global {
    namespace app{
        interface pageData {
            supabase: SupabaseClient
            session: Session | null
        }
    }
}

export {};