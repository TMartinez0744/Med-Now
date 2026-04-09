import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uxnujlpztzeiosjelxpf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bnVqbHB6dHplaW9zamVseHBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjI0NzMsImV4cCI6MjA5MTMzODQ3M30.qC0hJ8f6vf6toGa5LFsFoJNrr3urxYPssdGOi5JU7Yw";

export const supabase = createClient(supabaseUrl, supabaseKey);