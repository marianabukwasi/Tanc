import NavBar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'About — TANC',
  description: 'TANC is a global opportunity platform connecting adults worldwide with scholarships, fellowships, grants, conferences, and more.',
}

export default function AboutPage() {
  return (
    <>
      <NavBar />
      <main style={{ paddingTop: '64px', minHeight: '100vh', backgroundColor: '#ffffff' }}>

        {/* Hero */}
        <section style={{
          backgroundColor: '#1B2A6B',
          color: '#ffffff',
          padding: '80px 48px',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '42px', fontWeight: 800, margin: '0 0 20px', lineHeight: 1.15 }}>
              Time and Chance
            </h1>
            <p style={{ fontSize: '20px', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
              A global platform built on a simple belief: every person on earth deserves access to the opportunities that can change their life.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section style={{ maxWidth: '800px', margin: '0 auto', padding: '72px 48px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0a1628', marginBottom: '24px' }}>
            What we do
          </h2>
          <p style={{ fontSize: '17px', lineHeight: 1.8, color: '#334155', marginBottom: '20px' }}>
            TANC — Time and Chance — finds scholarships, fellowships, retreats, conferences, sports events, competitions, grants, and every other opportunity for adults worldwide, and matches them to the right person before the deadline passes.
          </p>
          <p style={{ fontSize: '17px', lineHeight: 1.8, color: '#334155', marginBottom: '20px' }}>
            We believe the gap between a person and an opportunity is not ability — it is information, timing, and access. We close that gap.
          </p>
          <p style={{ fontSize: '17px', lineHeight: 1.8, color: '#334155' }}>
            Regardless of where you were born, who you know, or how connected you are, TANC finds what is open right now and tells you whether you qualify.
          </p>
        </section>

        {/* Values */}
        <section style={{ backgroundColor: '#f8fafc', padding: '72px 48px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0a1628', marginBottom: '48px' }}>
              What we stand for
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px' }}>
              {[
                {
                  title: 'Access for everyone',
                  body: 'The best opportunities should not be reserved for people who already know where to look. We surface them for everyone.',
                },
                {
                  title: 'No deadline missed',
                  body: 'Opportunities expire. We track thousands of listings in real time and alert you before the window closes.',
                },
                {
                  title: 'Honest matching',
                  body: 'We tell you what you are genuinely eligible for — and explain gaps clearly so you can close them.',
                },
                {
                  title: 'Global first',
                  body: 'TANC is built for the entire world. We specifically prioritise opportunities open to applicants from developing countries and the Global South.',
                },
              ].map(({ title, body }) => (
                <div key={title}>
                  <div style={{
                    width: '40px', height: '4px', backgroundColor: '#1B2A6B',
                    borderRadius: '2px', marginBottom: '16px',
                  }} />
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0a1628', marginBottom: '10px' }}>{title}</h3>
                  <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#475569', margin: 0 }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it is for */}
        <section style={{ maxWidth: '800px', margin: '0 auto', padding: '72px 48px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0a1628', marginBottom: '24px' }}>
            Who TANC is for
          </h2>
          <p style={{ fontSize: '17px', lineHeight: 1.8, color: '#334155', marginBottom: '16px' }}>
            TANC is for adults 18 and over who want to grow — students looking for scholarships, early-career professionals seeking fellowships, researchers hunting grants, artists applying to residencies, and anyone who has ever thought "there must be more out there."
          </p>
          <p style={{ fontSize: '17px', lineHeight: 1.8, color: '#334155' }}>
            You do not need a prestigious background. You need ambition, a deadline, and TANC.
          </p>
        </section>

        {/* CTA */}
        <section style={{
          backgroundColor: '#1B2A6B', color: '#ffffff',
          padding: '64px 48px', textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 16px' }}>
            Find your next opportunity
          </h2>
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.8)', margin: '0 0 32px' }}>
            Browse thousands of open opportunities matched to your profile.
          </p>
          <a
            href="/opportunities"
            style={{
              display: 'inline-block',
              backgroundColor: '#ffffff',
              color: '#1B2A6B',
              fontWeight: 700,
              fontSize: '16px',
              padding: '14px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            Browse Opportunities
          </a>
        </section>

      </main>
      <Footer />
    </>
  )
}
