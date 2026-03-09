import { prisma } from './src/lib/prisma'

const testPosts = [
    {
        title: "IA Revoluciona a Criação de Conteúdo em 2026",
        slug: "ia-revoluciona-criacao-conteudo",
        content: "<h2>O impacto da IA nos blogs</h2><p>A inteligência artificial atingiu um novo patamar de sofisticação, permitindo que criadores foquem na estratégia enquanto máquinas cuidam da produção em massa com qualidade humana.</p><p>Especialistas indicam que a personalização em tempo real será a chave para o engajamento nos próximos anos.</p>",
        excerpt: "Novas ferramentas permitem automação total com qualidade editorial superior.",
        published: true,
    },
    {
        title: "Mercado de Tecnologia Aquece com Novos Chips Quânticos",
        slug: "mercado-tecnologia-chips-quanticos",
        content: "<h2>A nova era da computação</h2><p>Empresas globais anunciaram a primeira linha de processadores quânticos para uso comercial, prometendo velocidades até 1000x superiores aos chips atuais.</p><p>O setor financeiro e a medicina devem ser os primeiros beneficiados por essa tecnologia disruptiva.</p>",
        excerpt: "Computação quântica chega ao mercado comercial prometendo revolução no processamento de dados.",
        published: true,
    },
    {
        title: "Dicas de SEO para Rankear seu Blog no Google",
        slug: "dicas-seo-rankear-blog-google",
        content: "<h2>Otimização para 2026</h2><p>Rankear no Google exige mais do que apenas palavras-chave em 2026. A autoridade do domínio e a velocidade de carregamento (Core Web Vitals) continuam sendo os pilares fundamentais.</p><ul><li>Use títulos chamativos mas honestos</li><li>Otimize imagens para WebP</li><li>Garanta um sitemap dinâmico</li></ul>",
        excerpt: "Aprenda as estratégias mais eficazes para dominar a primeira página das buscas.",
        published: true,
    },
    {
        title: "Economia Global Mostra Sinais de Recuperação",
        slug: "economia-global-recuperacao-2026",
        content: "<h2>Crescimento Sustentável</h2><p>Após um período de incertezas, os principais índices econômicos mundiais apontam para um crescimento de 3% no PIB global.</p><p>Setores de energia renovável lideram a alta, atraindo investimentos trilionários.</p>",
        excerpt: "PIB mundial deve crescer 3% este ano, impulsionado por energias limpas.",
        published: true,
    },
    {
        title: "Lançamento da Missão Marte: O que esperar?",
        slug: "missao-marte-lancamento-2026",
        content: "<h2>Rumo ao Planeta Vermelho</h2><p>A agência espacial anunciou o cronograma final para a primeira missão tripulada de longa duração. O lançamento está previsto para o próximo semestre.</p><p>A aeronave conta com tecnologias inéditas de reciclagem de oxigênio e produção de combustível no local.</p>",
        excerpt: "Humanidade se prepara para o maior salto tecnológico da exploração espacial.",
        published: true,
    }
]

async function seed() {
    console.log('Populando banco de dados com posts de teste...')
    for (const post of testPosts) {
        await prisma.post.upsert({
            where: { slug: post.slug },
            update: {},
            create: post,
        })
    }
    console.log('Posts de teste criados com sucesso!')
}

seed()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
