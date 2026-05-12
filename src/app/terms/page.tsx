import NavBar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Terms of Service — TANC',
  description: 'The terms and conditions governing use of the TANC platform.',
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: '40px' }}>
    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0a1628', marginBottom: '12px' }}>{title}</h2>
    <div style={{ fontSize: '15px', lineHeight: 1.8, color: '#334155' }}>{children}</div>
  </section>
)

export default function TermsPage() {
  return (
    <>
      <NavBar />
      <main style={{ paddingTop: '64px', minHeight: '100vh', backgroundColor: '#ffffff' }}>

        <div style={{ backgroundColor: '#1B2A6B', padding: '56px 48px', color: '#ffffff' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 12px' }}>Terms of Service</h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', margin: 0, fontSize: '15px' }}>
              Last updated: 12 May 2026. By using TANC, you agree to these terms.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 48px' }}>

          <p style={{ fontSize: '16px', lineHeight: 1.8, color: '#334155', marginBottom: '40px' }}>
            These Terms of Service govern your use of TANC (tancglobal.com). By creating an account or browsing the platform, you agree to be bound by these terms. If you do not agree, please do not use TANC.
          </p>

          <Section title="1. The service">
            <p style={{ marginBottom: '12px' }}>TANC is an opportunity discovery and matching platform. We aggregate publicly available information about scholarships, fellowships, grants, conferences, residencies, competitions, and other programmes, and help you find ones that match your profile.</p>
            <p>We reserve the right to modify, suspend, or discontinue any part of the service at any time with or without notice.</p>
          </Section>

          <Section title="2. Eligibility">
            <p>You must be at least 18 years old to create an account on TANC. By using TANC, you confirm that you meet this age requirement.</p>
          </Section>

          <Section title="3. Your account">
            <p style={{ marginBottom: '12px' }}>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>
            <p>You agree to provide accurate information when creating your profile. Providing false information — for example, misrepresenting your qualifications — is a violation of these terms and may result in account termination.</p>
          </Section>

          <Section title="4. No guarantee of acceptance">
            <p style={{ marginBottom: '12px' }}>TANC provides information about opportunities and generates match scores based on your profile. We do not guarantee:</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '6px' }}>That any opportunity listed is currently open or accepting applications</li>
              <li style={{ marginBottom: '6px' }}>That you will be selected or accepted for any opportunity you apply to</li>
              <li style={{ marginBottom: '6px' }}>The accuracy or completeness of third-party opportunity listings</li>
            </ul>
            <p style={{ marginTop: '12px' }}>Always verify details directly with the opportunity provider before applying. Deadlines, eligibility criteria, and funding amounts are subject to change by the provider without notice to us.</p>
          </Section>

          <Section title="5. Affiliate links and commercial relationships">
            <p style={{ marginBottom: '12px' }}>Some links on TANC are affiliate links. This means that if you click a link and make a purchase or complete an action on a third-party site, we may earn a commission at no additional cost to you.</p>
            <p style={{ marginBottom: '12px' }}>Affiliate links are used for events and services such as conference tickets. We only link to programmes and services we believe are relevant to our users. Affiliate relationships do not influence which opportunities appear in search results or your match score.</p>
            <p>We comply with the FTC and ASA guidelines on affiliate disclosure.</p>
          </Section>

          <Section title="6. User content">
            <p style={{ marginBottom: '12px' }}>By submitting profile information, you grant TANC a non-exclusive, royalty-free licence to use that information to provide the service (including generating match scores and AI-powered recommendations).</p>
            <p>You must not submit content that is false, misleading, unlawful, defamatory, or that infringes any third-party rights.</p>
          </Section>

          <Section title="7. Prohibited use">
            <p style={{ marginBottom: '12px' }}>You agree not to:</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '6px' }}>Scrape, crawl, or harvest data from TANC without prior written permission</li>
              <li style={{ marginBottom: '6px' }}>Attempt to circumvent security measures or gain unauthorised access to any part of the service</li>
              <li style={{ marginBottom: '6px' }}>Use TANC for any unlawful purpose or in violation of any applicable regulation</li>
              <li style={{ marginBottom: '6px' }}>Create multiple accounts to abuse free features</li>
              <li>Interfere with the performance or integrity of the platform</li>
            </ul>
          </Section>

          <Section title="8. Intellectual property">
            <p>All content on TANC — including text, design, logos, code, and the Marie AI assistant — is the property of TANC or its licensors. You may not reproduce, distribute, or create derivative works without explicit written permission.</p>
          </Section>

          <Section title="9. Third-party links">
            <p>TANC links to external opportunity listings and third-party websites. We are not responsible for the content, accuracy, or practices of any third-party sites. Clicking an external link is at your own risk.</p>
          </Section>

          <Section title="10. Disclaimer of warranties">
            <p>TANC is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or free of viruses or other harmful components.</p>
          </Section>

          <Section title="11. Limitation of liability">
            <p>To the maximum extent permitted by law, TANC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of — or inability to use — the platform, including lost opportunities, lost income, or missed application deadlines.</p>
          </Section>

          <Section title="12. Account termination">
            <p style={{ marginBottom: '12px' }}>You may delete your account at any time from your Profile settings. We may suspend or terminate your account if you violate these terms, with or without prior notice.</p>
            <p>On termination, your personal data will be deleted in accordance with our <a href="/privacy" style={{ color: '#1B2A6B' }}>Privacy Policy</a>.</p>
          </Section>

          <Section title="13. Governing law">
            <p>These terms are governed by applicable law. Disputes shall be resolved in the courts of competent jurisdiction. Nothing in these terms limits your rights under applicable consumer protection law.</p>
          </Section>

          <Section title="14. Changes to these terms">
            <p>We may update these terms from time to time. We will notify you of material changes by email or via a notice on the platform. Continued use of TANC after the effective date of changes constitutes acceptance.</p>
          </Section>

          <Section title="15. Contact">
            <p>
              Questions about these terms?<br />
              Email: <a href="mailto:legal@tancglobal.com" style={{ color: '#1B2A6B' }}>legal@tancglobal.com</a>
            </p>
          </Section>

        </div>
      </main>
      <Footer />
    </>
  )
}
