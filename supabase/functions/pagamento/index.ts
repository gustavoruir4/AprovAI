import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, nome, cpf, telefone } = await req.json()

    if (!email || !nome || !cpf || !telefone) {
      return new Response(
        JSON.stringify({ error: 'email, nome, cpf e telefone são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cpfLimpo = cpf.replace(/\D/g, '')
    const telefoneLimpo = telefone.replace(/\D/g, '')

    const ABACATEPAY_KEY = Deno.env.get('ABACATEPAY_KEY')

    const res = await fetch('https://api.abacatepay.com/v1/billing/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ABACATEPAY_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        frequency: 'ONE_TIME',
        methods: ['PIX'],
        products: [{
          externalId: 'acesso-estudaenem',
          name: 'EstudaENEM — Acesso Completo',
          description: 'Acesso completo à plataforma até o ENEM',
          quantity: 1,
          price: 3990,
        }],
        returnUrl: 'https://estudaenem-sage.vercel.app/pagamento/erro',
        completionUrl: `https://estudaenem-sage.vercel.app/ativar?email=${encodeURIComponent(email)}`,
        customer: {
          name: nome,
          cellphone: telefoneLimpo,
          email,
          taxId: cpfLimpo,
        },
        metadata: { email },
      }),
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      throw new Error(data.error || data.message || 'Erro ao criar cobrança')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabase.from('acessos').upsert({
      email,
      status: 'pendente',
      payment_id: data.data?.id,
    }, { onConflict: 'email' })

    return new Response(
      JSON.stringify({ url: data.data?.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
