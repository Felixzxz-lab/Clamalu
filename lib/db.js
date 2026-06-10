// Lê TODAS as linhas de uma query do Supabase, contornando o teto padrão de 1000.
// Recebe uma função que constrói a query do zero (pra poder reaplicar .range a cada página).
export async function selectAll(makeQuery) {
  const PAGE = 1000
  let from = 0
  let all = []
  for (;;) {
    const { data, error } = await makeQuery().range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}
