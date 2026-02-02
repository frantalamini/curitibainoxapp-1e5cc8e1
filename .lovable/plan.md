
## Plano: Criar OS #2751 como Duplicata da #2750

### Diagnóstico
A OS **#2751 nunca foi criada**. A sequência pulou diretamente de #2750 para #2752 (provavelmente uma transação que reservou o número e falhou).

**Dados no banco:**
- #2749 ✓
- #2750 ✓ (Matteo Lanchonete - 22/01/2026)
- #2751 ✗ FALTANDO
- #2752 ✓
- #2753 até #2756 ✓

---

### Solução

Executar uma migração SQL para **inserir manualmente a OS #2751** como duplicata da #2750, apenas mudando o os_number.

---

### Migração SQL

```sql
INSERT INTO service_calls (
  os_number,
  client_id,
  technician_id,
  scheduled_date,
  scheduled_time,
  equipment_description,
  problem_description,
  notes,
  service_type_id,
  status,
  status_id,
  commercial_status_id,
  created_by
)
SELECT 
  2751,                          -- Número fixo da OS
  client_id,
  technician_id,
  scheduled_date,
  scheduled_time,
  equipment_description,
  problem_description,
  notes,
  service_type_id,
  status,
  status_id,
  commercial_status_id,
  created_by
FROM service_calls 
WHERE os_number = 2750;
```

---

### O que será feito

| Campo | Valor |
|-------|-------|
| os_number | 2751 (fixo) |
| Cliente | Matteo Lanchonete Ltda. |
| Técnico | Anderson (mesmo da #2750) |
| Data | 22/01/2026 |
| Equipamento | CABEÇOTE FRITADEIRA METALCUBAS |
| Problema | POSSIVELMENTE TERMOSTATO |

---

### O que NÃO será copiado

- Assinaturas
- Fotos/vídeos
- Relatório PDF
- Token de acesso ao relatório
- Histórico de viagens

---

### Garantia

- A sequence atual já está em **2775**, então não há risco de conflito
- As demais OSs (2752-2756) **não serão alteradas**

---

### Resultado Esperado

Após a migração:
```
#2756
#2755
#2754
#2753
#2752
#2751 ← Nova (duplicata da #2750)
#2750
#2749
```
