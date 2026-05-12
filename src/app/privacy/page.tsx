import NavBar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Privacy Policy — TANC',
  description: 'How TANC collects, uses, and protects your personal data.',
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: '40px' }}>
    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0a1628', marginBottom: '12px' }}>{title}</h2>
    <div style={{ fontSize: '15px', lineHeight: 1.8, color: '#334155' }}>{children}</div>
  </section>
)

export default function PrivacyPage() {
  return (
    <>
      <NavBar />
      <main style={{ paddingTop: '64px', minHeight: '100vh', backgroundColor: '#ffffff' }}>

        <div style={{ backgroundColor: '#1B2A6B', padding: '56px 48px', color: '#ffffff' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 12px' }}>Privacy Policy</h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', margin: 0, fontSize: '15px' }}>
              Last updated: 12 May 2026. Applies to tancglobal.com and all TANC services.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 48px' }}>

          <p style={{ fontSize: '16px', lineHeight: 1.8, color: '#334155', marginBottom: '40px' }}>
            We believe your data is yours. This policy explains in plain language what personal information TANC collects, why we collect it, how we use it, and what rights you have over it. If you have any questions, email us at <a href="mailto:privacy@tancglobal.com" style={{ color: '#1B2A6B' }}>privacy@tancglobal.com</a>.
          </p>

          <Section title="1. Who we are">
            <p>TANC (Time and Chance) operates the website tancglobal.com. We are the data controller for the personal data you provide when using our platform. You can contact us at <a href="mailto:privacy@tancglobal.com" style={{ color: '#1B2A6B' }}>privacy@tancglobal.com</a>.</p>
          </Section>

          <Section title="2. What data we collect">
            <p style={{ marginBottom: '12px' }}>We collect data in two ways:</p>
            <p style={{ fontWeight: 600, marginBottom: '6px' }}>Data you give us directly:</p>
            <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
              <li>Email address and password (when you create an account)</li>
              <li>Profile information: name, date of birth, nationality, country of residence, education, languages, work experience, skills, and preferences</li>
              <li>Conversation history with Marie (our AI assistant)</li>
              <li>Email notification preferences</li>
            </ul>
            <p style={{ fontWeight: 600, marginBottom: '6px' }}>Data collected automatically:</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li>Browser type, IP address, and pages visited (via standard server logs)</li>
              <li>Cookies necessary for authentication and session management (see Section 5)</li>
              <li>Opportunity clicks and tracker activity (to improve recommendations)</li>
            </ul>
          </Section>

          <Section title="3. How we use your data">
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}><strong>To provide the service:</strong> We use your profile to match you with relevant opportunities and personalise your experience.</li>
              <li style={{ marginBottom: '8px' }}><strong>To send you alerts:</strong> If you opt in, we email you when new opportunities match your profile or when deadlines approach.</li>
              <li style={{ marginBottom: '8px' }}><strong>To run Marie:</strong> Your profile and conversation history are sent to Anthropic's Claude API to generate responses. We do not store your conversations beyond the active session unless you ask us to save them.</li>
              <li style={{ marginBottom: '8px' }}><strong>To improve TANC:</strong> Aggregate, anonymised usage data helps us improve opportunity matching and fix bugs.</li>
              <li><strong>Legal compliance:</strong> We retain data as required by applicable law.</li>
            </ul>
          </Section>

          <Section title="4. Legal basis for processing (GDPR)">
            <p style={{ marginBottom: '12px' }}>Under the General Data Protection Regulation (GDPR), we process your data under the following legal bases:</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}><strong>Contract performance:</strong> Processing your profile data to deliver the matching and tracking services you signed up for.</li>
              <li style={{ marginBottom: '8px' }}><strong>Consent:</strong> Sending marketing and opportunity alert emails (you can withdraw consent at any time).</li>
              <li><strong>Legitimate interests:</strong> Improving our service using anonymised analytics, provided this does not override your rights.</li>
            </ul>
          </Section>

          <Section title="5. Cookies">
            <p style={{ marginBottom: '12px' }}>We use cookies for the following purposes:</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}><strong>Authentication cookies:</strong> Provided by Supabase to keep you logged in. These are strictly necessary and cannot be disabled.</li>
              <li style={{ marginBottom: '8px' }}><strong>Preference cookies:</strong> To remember your settings (e.g., notification preferences). You can clear these in your browser.</li>
              <li><strong>Analytics cookies:</strong> We may use privacy-respecting analytics (no cross-site tracking). We do not use Google Analytics or any advertising trackers.</li>
            </ul>
            <p style={{ marginTop: '12px' }}>Affiliate links on TANC (e.g., TicketNetwork) may set their own cookies when you click through. We are not responsible for third-party cookie practices.</p>
          </Section>

          <Section title="6. Third-party services">
            <p style={{ marginBottom: '12px' }}>We use these third-party services to operate TANC:</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}><strong>Supabase</strong> (supabase.com) — database and authentication. Your account data and profile are stored on Supabase infrastructure in the EU. See <a href="https://supabase.com/privacy" style={{ color: '#1B2A6B' }}>Supabase Privacy Policy</a>.</li>
              <li style={{ marginBottom: '8px' }}><strong>Anthropic</strong> (anthropic.com) — the AI model powering Marie. Your messages to Marie and your profile summary are processed by Anthropic's API. Anthropic does not train on API data by default. See <a href="https://www.anthropic.com/privacy" style={{ color: '#1B2A6B' }}>Anthropic Privacy Policy</a>.</li>
              <li><strong>Resend</strong> (resend.com) — transactional email delivery. Your email address is shared with Resend solely to deliver emails you have opted into. See <a href="https://resend.com/privacy" style={{ color: '#1B2A6B' }}>Resend Privacy Policy</a>.</li>
            </ul>
          </Section>

          <Section title="7. Data retention">
            <p>We retain your account and profile data for as long as your account is active. If you delete your account, we delete your personal data within 30 days, except where we are legally required to retain it (e.g., financial records). Anonymised, aggregated data may be retained indefinitely.</p>
          </Section>

          <Section title="8. Your rights">
            <p style={{ marginBottom: '12px' }}>Under GDPR and applicable data protection law, you have the right to:</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '6px' }}><strong>Access</strong> the personal data we hold about you</li>
              <li style={{ marginBottom: '6px' }}><strong>Correct</strong> inaccurate data</li>
              <li style={{ marginBottom: '6px' }}><strong>Delete</strong> your data (right to erasure)</li>
              <li style={{ marginBottom: '6px' }}><strong>Restrict</strong> how we process your data</li>
              <li style={{ marginBottom: '6px' }}><strong>Portability</strong> — receive your data in a machine-readable format</li>
              <li style={{ marginBottom: '6px' }}><strong>Object</strong> to processing based on legitimate interests</li>
              <li><strong>Withdraw consent</strong> at any time for email communications</li>
            </ul>
            <p style={{ marginTop: '12px' }}>To exercise any of these rights, email <a href="mailto:privacy@tancglobal.com" style={{ color: '#1B2A6B' }}>privacy@tancglobal.com</a>. We will respond within 30 days. You also have the right to lodge a complaint with your national data protection authority.</p>
          </Section>

          <Section title="9. Data security">
            <p>We use industry-standard security measures: encrypted connections (HTTPS), hashed passwords, and access controls. No method of transmission over the internet is 100% secure. If you discover a security vulnerability, please report it to <a href="mailto:security@tancglobal.com" style={{ color: '#1B2A6B' }}>security@tancglobal.com</a>.</p>
          </Section>

          <Section title="10. Children">
            <p>TANC is for adults 18 and over. We do not knowingly collect data from anyone under 18. If you believe a minor has created an account, contact us at <a href="mailto:privacy@tancglobal.com" style={{ color: '#1B2A6B' }}>privacy@tancglobal.com</a> and we will delete the account.</p>
          </Section>

          <Section title="11. Changes to this policy">
            <p>We may update this policy from time to time. If we make material changes, we will notify you by email or by displaying a notice on the platform. Continued use of TANC after notification constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="12. Contact">
            <p>
              TANC — Time and Chance<br />
              Email: <a href="mailto:privacy@tancglobal.com" style={{ color: '#1B2A6B' }}>privacy@tancglobal.com</a><br />
              Website: tancglobal.com
            </p>
          </Section>

        </div>
      </main>
      <Footer />
    </>
  )
}
