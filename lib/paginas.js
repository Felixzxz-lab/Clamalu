// Páginas do dashboard, na ordem do menu. O id é o que fica em usuarios.paginas
// e o caminho é /dashboard/<id>. Página nova entra aqui e no painel Admin sozinha.
export const PAGINAS = [
  { id: 'vendedor', nome: 'Vendedor' },
  { id: 'produto', nome: 'Produto' },
  { id: 'cliente', nome: 'Cliente' },
  { id: 'comparacao', nome: 'Comparação' },
  { id: 'financeiro', nome: 'Financeiro' },
  { id: 'culturas', nome: 'Culturas' },
  { id: 'enzimas', nome: 'Enzimas' },
]
export const PAGINA_IDS = PAGINAS.map(p => p.id)
export const nomePagina = id => PAGINAS.find(p => p.id === id)?.nome || id

// A apresentação semanal (/apresentacao) usa os dados de vendas: aparece para
// quem tem ao menos uma das telas de vendas.
export const podeApresentar = user => ['vendedor', 'produto', 'cliente', 'comparacao'].some(p => user?.paginas?.includes(p))
