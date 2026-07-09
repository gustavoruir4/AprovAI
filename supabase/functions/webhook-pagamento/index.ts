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

  // A AbacatePay envia o secret do webhook como query string na URL cadastrada
  // no painel deles: https://.../webhook-pagamento?webhookSecret=SEU_SECRET
  const url = new URL(req.url)
  const webhookSecret = url.searchParams.get('webhookSecret')

  if (webhookSecret !== Deno.env.get('ABACATEPAY_WEBHOOK_SECRET')) {
    return new Response(
      JSON.stringify({ error: 'unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body = await req.json()
    const { event, data } = body

    // AbacatePay v2 usa checkout.completed
    if (event !== 'checkout.completed') {
      return new Response('ok', { headers: corsHeaders })
    }

    const email = data?.metadata?.email
    const payment_id = data?.id

    if (!email) {
      return new Response('email não encontrado', { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabase
      .from('acessos')
      .upsert({
        email,
        status: 'pago',
        payment_id,
        paid_at: new Date().toISOString(),
      }, { onConflict: 'email' })

    // ── Email de confirmação pós-pagamento ──
    //
    // TODO: migrar para a API do Resend (https://api.resend.com/emails) quando
    // a conta em resend.com estiver criada. Fica assim, pronto pra ligar:
    //
    // await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'EstudaENEM <contato@estudaenem.com>',
    //     to: email,
    //     subject: 'Pagamento confirmado — ative sua conta',
    //     html: `<p>Seu pagamento foi confirmado! Clique para ativar sua conta:</p>
    //            <p><a href="https://estudaenem-sage.vercel.app/ativar?email=${encodeURIComponent(email)}">Ativar minha conta</a></p>`,
    //   }),
    // })
    //
    // Por enquanto, geramos o link de ativação pelo Supabase Auth. IMPORTANTE:
    // generateLink SÓ gera o link — ele não envia e-mail sozinho (isso exige
    // um provedor de e-mail customizado, como o Resend acima, ou
    // supabase.auth.admin.inviteUserByEmail, que dispara o e-mail padrão do
    // Supabase mas já cria a conta na hora). Deixamos a chamada pronta para
    // quando o envio (Resend) for ligado; hoje ela só teria efeito de log.
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email,
        password: crypto.randomUUID(),
        options: {
          redirectTo: `https://estudaenem-sage.vercel.app/ativar?email=${encodeURIComponent(email)}`,
        },
      })
    } catch (mailErr) {
      console.error('Erro ao gerar link de ativação:', mailErr)
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
