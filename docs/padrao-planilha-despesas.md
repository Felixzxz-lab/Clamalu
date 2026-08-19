# Padrão da planilha de DESPESAS — Clamalu

Este é o formato que o sistema lê em **Admin → Despesas**. A planilha que sair
deste padrão ou é recusada na prévia, ou entra com o lançamento no grupo errado.

Vale para `.xlsx`, `.xls` e `.ods`.

---

## 1. O layout

Uma aba por mês (ou uma aba com o ano inteiro — os dois funcionam, ver §5).

| linha | conteúdo |
|---|---|
| 1 | Título livre. Ex.: `RESUMO DESPESAS CLAMALU JULHO 2026` |
| 2 | **Cabeçalho** — `FAVORECIDO` \| `DESPESA` \| `JUL` |
| 3+ | Um lançamento por linha |
| última | `DESPESAS DA CLAMALU` + total geral (linha de conferência, **não** é importada) |

Exemplo:

```
RESUMO DESPESAS CLAMALU JULHO 2026
FAVORECIDO                DESPESA              JUL
AGUIA TUR                 Fretes                    630,00
CHR HANSEN                Revenda             1.139.008,82
ICMS                      Encargos               69.301,79
UNIMED                    Convenio               33.248,03
DESPESAS DA CLAMALU                            1.684.099,83
```

### As três colunas

| coluna | o que é | vai para |
|---|---|---|
| **FAVORECIDO** | quem recebeu — fornecedor, rubrica ou imposto | campo `despesa` |
| **DESPESA** | o *tipo* do gasto (§4) | campo `categoria` → vira o **grupo** dos gráficos |
| **JAN…DEZ** | o valor do mês | campo `valor` |

> A 1ª coluna pode se chamar `FAVORECIDO`, `FORNECEDOR` ou `DESPESA` — o leitor
> aceita os três. O que **não** pode mudar é a **ordem**: favorecido primeiro,
> tipo em segundo, meses depois.

---

## 2. Regras que o leitor aplica

- **Cabeçalho** precisa estar em uma das **8 primeiras linhas**.
- **Colunas de mês** são reconhecidas pela sigla exata: `JAN FEV MAR ABR MAI JUN
  JUL AGO SET OUT NOV DEZ`. Acento e caixa não importam; `JULHO` ou `07`
  **não** são reconhecidos.
- **Coluna TOTAL é ignorada** de propósito — o total é recalculado somando as
  células dos meses. (Numa planilha antiga a fórmula do TOTAL tinha falhado em
  uma linha; por isso o sistema não confia nessa coluna.)
- **Valor vazio ou zero não vira lançamento.** Não é preciso preencher com `0`
  nem com `-`.
- **Valores** podem vir como número, `1.234,56`, `1234.56` ou `R$ 1.234,56`.
- **Linha sem favorecido é pulada.** Linha em branco no meio não atrapalha.
- **Linhas ignoradas de propósito:** a que começa com `DESPESAS DA CLAMALU`
  (total geral) e a do rodapé que começa com `Índia`.

---

## 3. Nome da aba — é de onde sai o ANO

O ano **não** vem do nome do arquivo: vem do **nome da aba**, pelo primeiro
número de 4 dígitos começando em `20`.

- ✅ `CLAMALU JULHO 2026` → 2026
- ✅ `CLAMALU 2026` → 2026
- ❌ `JULHO` → cai no ano corrente **silenciosamente**, e o lançamento vai para
  o ano errado.

**Sempre coloque o ano com 4 dígitos no nome da aba.**

O nome do **arquivo** é livre; o padrão em uso é
`DESPESAS GERAIS <MÊS>-<AA>.xlsx`.

---

## 4. Coluna DESPESA — vocabulário

O texto dessa coluna decide o **grupo** que aparece nos gráficos do Financeiro.
Use os termos abaixo; escrever diferente a cada mês quebra a comparação mês a mês.

| Grupo no dashboard | Escreva na coluna DESPESA |
|---|---|
| Impostos e Encargos | `Encargos` |
| Folha e Benefícios | `Funcionarios`, `Convenio`, `Vale Transporte` |
| Fretes e Logística | `Fretes`, `Entregas`, `Postagens` |
| Revenda / Mercadoria | `Revenda`, `Gelo seco` |
| Locação de Veículos | `Locação automovel` |
| Viagens | `Cartao`, `Passagem aerea`, `Hospedagem` |
| Marketing | `Marketing`, `Anuncios e Revistas`, `E-BOOKS`, `Brindes p/ Evento` |
| Telefonia e Internet | `VIVO`, `VIVO FIXO`, `VIVO E CLARO`, `Manut. PABX` |
| Utilidades e Imóveis | `Consumo energia`, `Consumo`, `Imoveis` |
| Manutenção | `Manut. Software`, `Manut. Segurança`, `Manutenção` |
| TI e Software | `Dashboards`, `TI`, `Licença Software`, `Hosp de Site`, `Recarga Toner` |
| Serviços e Licenças | `Hon Contabeis`, `Licenças`, `Conselho`, `Renovacao` |
| Tarifas Bancárias | `Tarifas de banco` |
| Materiais e Escritório | `Mat Escritorio` |

**Termo fora da lista cai em "Outros"** — não dá erro, só some dentro de um
grupo genérico. Se aparecer uma despesa nova recorrente, a saída certa é
cadastrar o termo em `lib/despesas.js` (constante `REGRAS`), não inventar uma
variação do nome.

Variações que hoje geram o mesmo grupo mas **poluem** a leitura — padronize numa
forma só: `Manut.` vs `Manutencao` vs `Manutenção`; `Licencas` vs `Licenças`;
`Locação de carro` vs `Locação automovel`; `Dashboards` vs `Dashboards planilhas`.

---

## 5. Como o sistema grava (importante)

A importação **substitui por ano + mês**: apaga os lançamentos dos meses que
existem no arquivo e regrava só eles.

- Subir o resumo de **um mês** → mexe **só** naquele mês. Os anteriores ficam.
- Subir a matriz do **ano inteiro** → atualiza todos os meses preenchidos nela.
- **Re-subir o mesmo mês corrigido é seguro** e não duplica: o mês é apagado e
  regravado.
- Um mês que estiver **vazio na planilha não é apagado** do banco. Para zerar um
  mês é preciso apagar no banco, não basta esvaziar a coluna.

---

## 6. Antes de confirmar, confira na prévia

O botão de importar mostra uma prévia sem gravar nada. Confira:

1. **Ano** detectado (veio do nome da aba?).
2. **Meses** listados — só os que você espera.
3. **Total** contra a linha `DESPESAS DA CLAMALU` da planilha.
4. **Quantos foram para "Outros"** — se saltou, tem termo novo na coluna DESPESA.

---

## 7. Checklist de 30 segundos

- [ ] Nome da aba tem o ano com 4 dígitos
- [ ] Linha de cabeçalho nas 8 primeiras linhas, com `FAVORECIDO | DESPESA | <MÊS>`
- [ ] Sigla do mês com 3 letras (`JUL`, não `JULHO`)
- [ ] Coluna DESPESA usando os termos do §4
- [ ] Linha `DESPESAS DA CLAMALU` no fim, para bater o total na prévia
