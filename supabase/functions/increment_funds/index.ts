
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { site_id, amount } = await req.json()

    if (!site_id || amount === undefined) {
      return new Response(
        JSON.stringify({ error: 'Site ID and amount are required' }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 400 
        }
      )
    }

    // Get current funds value
    const { data: siteData, error: siteError } = await supabaseClient
      .from('sites')
      .select('funds')
      .eq('id', site_id)
      .single()

    if (siteError) {
      console.error('Error fetching site:', siteError)
      return new Response(
        JSON.stringify({ error: `Error fetching site: ${siteError.message}` }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      )
    }

    // Calculate new funds value
    const currentFunds = siteData.funds || 0
    const newFunds = currentFunds + amount

    // Update site with new funds value
    const { data, error } = await supabaseClient
      .from('sites')
      .update({ funds: newFunds })
      .eq('id', site_id)
      .select()

    if (error) {
      console.error('Error updating site funds:', error)
      return new Response(
        JSON.stringify({ error: `Error updating site funds: ${error.message}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        previous_funds: currentFunds,
        new_funds: newFunds 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Unexpected error occurred' }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 500 
      }
    )
  }
})
