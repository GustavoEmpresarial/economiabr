import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { prisma } from '@/lib/prisma'
import styles from './page.module.css'

const ADMIN_COOKIE = 'autoblog_admin_session'

function normalizeSecret(value: unknown): string {
  const text = String(value ?? '').trim()
  return text.replace(/^['\"]+|['\"]+$/g, '')
}

function expectedSecret(): string {
  return normalizeSecret(process.env.API_SECRET || 'autoblog_secret_2026')
}

async function isAuthenticated(): Promise<boolean> {
  const store = await cookies()
  const session = normalizeSecret(store.get(ADMIN_COOKIE)?.value)
  return Boolean(session) && session === expectedSecret()
}

async function loginAction(formData: FormData) {
  'use server'

  const password = normalizeSecret(formData.get('password'))
  if (!password || password !== expectedSecret()) {
    redirect('/admin?error=1')
  }

  const store = await cookies()
  store.set(ADMIN_COOKIE, password, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  })

  redirect('/admin')
}

async function logoutAction() {
  'use server'

  const store = await cookies()
  store.delete(ADMIN_COOKIE)
  redirect('/admin')
}

async function togglePublishAction(formData: FormData) {
  'use server'

  if (!(await isAuthenticated())) {
    redirect('/admin')
  }

  const id = String(formData.get('id') ?? '')
  const nextValue = String(formData.get('nextPublished') ?? 'false') === 'true'

  if (!id) {
    redirect('/admin')
  }

  await prisma.post.update({
    where: { id },
    data: { published: nextValue },
  })

  revalidatePath('/')
  revalidatePath('/admin')
  redirect('/admin')
}

async function deletePostAction(formData: FormData) {
  'use server'

  if (!(await isAuthenticated())) {
    redirect('/admin')
  }

  const id = String(formData.get('id') ?? '')

  if (!id) {
    redirect('/admin')
  }

  await prisma.post.delete({ where: { id } })

  revalidatePath('/')
  revalidatePath('/admin')
  redirect('/admin')
}

interface AdminPageProps {
  searchParams: Promise<{ error?: string }>
}

export const dynamic = 'force-dynamic'

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const query = await searchParams
  const authed = await isAuthenticated()

  if (!authed) {
    return (
      <div className={styles.wrap}>
        <div className={styles.loginBox}>
          <h1 className={styles.loginTitle}>Painel Admin</h1>
          <p className={styles.loginHint}>Entre com sua chave de administracao para gerenciar os artigos.</p>
          {query.error ? <p className={styles.error}>Senha invalida.</p> : null}

          <form action={loginAction}>
            <input
              className={styles.input}
              name="password"
              type="password"
              placeholder="Senha admin"
              autoComplete="current-password"
              required
            />
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit">
              Entrar
            </button>
          </form>
        </div>
      </div>
    )
  }

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 120,
  })

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <div>
          <h1 className={styles.title}>Admin do Blog</h1>
          <p className={styles.subtitle}>Gerencie status e limpeza de conteudo em tempo real.</p>
        </div>

        <div className={styles.actions}>
          <Link href="/" className={styles.btn}>Ver site</Link>
          <form action={logoutAction}>
            <button className={styles.btn} type="submit">Sair</button>
          </form>
        </div>
      </div>

      <section className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Titulo</th>
              <th>Status</th>
              <th>Criado em</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td>
                  <div className={styles.postTitle}>{post.title}</div>
                  <div className={styles.meta}>/{post.slug}</div>
                </td>
                <td>
                  <span className={`${styles.badge} ${post.published ? styles.badgeOn : styles.badgeOff}`}>
                    {post.published ? 'Publicado' : 'Oculto'}
                  </span>
                </td>
                <td>
                  <span className={styles.meta}>
                    {new Date(post.createdAt).toLocaleDateString('pt-BR')} {new Date(post.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <form className={styles.inlineForm} action={togglePublishAction}>
                      <input type="hidden" name="id" value={post.id} />
                      <input type="hidden" name="nextPublished" value={String(!post.published)} />
                      <button className={styles.btn} type="submit">
                        {post.published ? 'Despublicar' : 'Publicar'}
                      </button>
                    </form>

                    <Link className={styles.btn} href={`/blog/${post.slug}`} target="_blank">
                      Abrir
                    </Link>

                    <form className={styles.inlineForm} action={deletePostAction}>
                      <input type="hidden" name="id" value={post.id} />
                      <button className={`${styles.btn} ${styles.btnDanger}`} type="submit">
                        Excluir
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
