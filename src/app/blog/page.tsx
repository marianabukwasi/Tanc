import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Insights, tips, and resources for global opportunity seekers.',
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

interface BlogPost {
  id: string
  slug: string
  title: string
  description: string | null
  tags: string[] | null
  published_at: string | null
}

export default async function BlogPage() {
  const supabase = getServiceClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, slug, title, description, tags, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 80px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0a1628', marginBottom: '8px' }}>Blog</h1>
      <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '40px' }}>
        Insights, tips, and resources for global opportunity seekers.
      </p>

      {(!posts || posts.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '64px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>✍️</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#475569' }}>No posts yet</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>Check back soon for articles about scholarships, fellowships, and more.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {(posts as BlogPost[]).map(post => (
            <article
              key={post.id}
              style={{
                padding: '24px',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                backgroundColor: '#fff',
              }}
            >
              {post.tags && post.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {post.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '50px',
                        backgroundColor: '#fef9ee', color: '#d4a017',
                        textTransform: 'uppercase', letterSpacing: '0.4px',
                      }}
                    >{tag}</span>
                  ))}
                </div>
              )}
              <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0a1628', marginBottom: '8px', lineHeight: 1.3 }}>
                  {post.title}
                </h2>
              </Link>
              {post.description && (
                <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '12px' }}>
                  {post.description}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {post.published_at && (
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                <Link
                  href={`/blog/${post.slug}`}
                  style={{ fontSize: '13px', fontWeight: 600, color: '#d4a017', textDecoration: 'none' }}
                >
                  Read more →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
