import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const supabase = getServiceClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, description')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) return { title: 'Post Not Found' }
  return {
    title: post.title,
    description: post.description ?? undefined,
    openGraph: { title: post.title, description: post.description ?? undefined, type: 'article' },
    twitter: { card: 'summary', title: post.title, description: post.description ?? undefined },
  }
}

export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = getServiceClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) notFound()

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>

      <Link
        href="/blog"
        style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '28px' }}
      >
        ← Back to Blog
      </Link>

      {post.tags && post.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {(post.tags as string[]).map(tag => (
            <span
              key={tag}
              style={{
                fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '50px',
                backgroundColor: '#fef9ee', color: '#1B2A6B',
                textTransform: 'uppercase', letterSpacing: '0.4px',
              }}
            >{tag}</span>
          ))}
        </div>
      )}

      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0a1628', lineHeight: 1.25, marginBottom: '12px' }}>
        {post.title as string}
      </h1>

      {post.published_at && (
        <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '32px' }}>
          {new Date(post.published_at as string).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      )}

      {post.description && (
        <p style={{
          fontSize: '18px', color: '#475569', lineHeight: 1.7, marginBottom: '32px',
          fontWeight: 400, borderLeft: '3px solid #1B2A6B', paddingLeft: '16px',
        }}>
          {post.description as string}
        </p>
      )}

      {post.content && (
        <div style={{ fontSize: '16px', color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
          {post.content as string}
        </div>
      )}

      <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
        <Link
          href="/opportunities"
          style={{
            display: 'inline-block', padding: '11px 24px',
            backgroundColor: '#0a1628', color: '#1B2A6B',
            borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none',
          }}
        >
          Browse Opportunities →
        </Link>
      </div>
    </div>
  )
}
