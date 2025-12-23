import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jqdnejbgiosjxubrkbpp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxZG5lamJnaW9zanh1YnJrYnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzU3OTQsImV4cCI6MjA4MjA1MTc5NH0.yeRXf3AO0gN0eYdw92Q5UzIkExvkhr4jv_caBTBypAs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);