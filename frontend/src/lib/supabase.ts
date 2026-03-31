import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://eufakajmjeenxeciisom.supabase.co/";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZmFrYWptamVlbnhlY2lpc29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MzQwNDUsImV4cCI6MjA5MDQxMDA0NX0.Sk8BK_LjZMXO8VlVtlxWgcmFlU5DNd5fLADERk7RZxI";

export const supabase = createClient(supabaseUrl, supabaseKey);