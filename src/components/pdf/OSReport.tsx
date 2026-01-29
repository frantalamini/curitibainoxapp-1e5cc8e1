import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Tipos de dados para o PDF
type Report = {
  company: {
    name: string;
    cnpj?: string;
    ie?: string;
    phone?: string;
    email?: string;
    site?: string;
    address?: string;
    logoDataUrl?: string;
  };
  os: {
    number: number | string;
    issueDate?: string;
    status?: string;
    dueDate?: string;
    finishDate?: string;
  };
  client: {
    name: string;
    phone?: string;
    email?: string;
    cnpj?: string;
    ie?: string;
    address?: string;
  };
  general: {
    equipment?: string;
    serialNumber?: string;
    problemDescription?: string;
    serviceType?: string;
    checklistTitle?: string | null;
    notes?: string | null;
    schedule?: {
      date?: string;
      time?: string;
      startedAt?: string;
    };
    technician?: { name: string };
  };
  technical: {
    analysisAndActions?: string | null;
    extraFields?: { label: string; value: string }[];
  };
  photos: {
    before: { images: string[]; videos?: string[] };
    after: { images: string[]; videos?: string[] };
  };
  checklist?: {
    title: string;
    filledBy?: string;
    filledAt?: string;
    sections: {
      title: string;
      items: {
        label: string;
        status: "OK" | "NC" | "NA" | "Pendente";
        note?: string | null;
        photos?: string[];
      }[];
    }[];
  } | null;
  signatures: {
    tech?: { name: string; when?: string; imageDataUrl?: string } | null;
    client?: { name: string; role?: string; when?: string; imageDataUrl?: string } | null;
  };
  // Dados financeiros (opcional - apenas para relatório completo)
  financial?: {
    items: {
      type: 'PRODUCT' | 'SERVICE' | 'FEE' | 'DISCOUNT';
      description: string;
      qty: number;
      unitPrice: number;
      discountType: string | null;
      discountValue: number;
      total: number;
    }[];
    subtotals: {
      products: number;
      services: number;
      fees: number;
      discounts: number;
    };
    osDiscounts: {
      partsType: string | null;
      partsValue: number;
      servicesType: string | null;
      servicesValue: number;
      totalType: string | null;
      totalValue: number;
    };
    grandTotal: number;
    installments: {
      number: number;
      dueDate: string;
      amount: number;
      paymentMethod: string | null;
      status: string;
    }[];
  } | null;
};

// Estilos do PDF
const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#111111',
    lineHeight: 1.35,
  },

  // Cabeçalho
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logoContainer: {
    width: 200,
    minHeight: 60,
  },
  logo: {
    width: 190,
    maxHeight: 70,
    objectFit: 'cover',
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 9,
    maxWidth: 250,
  },
  companyName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  companyText: {
    fontSize: 8,
    marginBottom: 1,
    color: '#333333',
  },

  // Título
  title: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    paddingVertical: 8,
    marginBottom: 12,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#C9CED6',
  },

  // Seções
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    borderBottomWidth: 0.5,
    borderColor: '#C9CED6',
    paddingBottom: 4,
    marginBottom: 6,
  },
  sectionContent: {
    padding: 8,
    borderWidth: 0.5,
    borderColor: '#C9CED6',
    borderRadius: 3,
    fontSize: 10,
  },
  sectionText: {
    fontSize: 10,
    lineHeight: 1.4,
  },

  // Grid 2 colunas
  grid2Cols: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  col1: {
    flex: 1.6,
  },
  col2: {
    flex: 1,
  },
  colEquip: {
    flex: 1.9,
  },
  colSerial: {
    flex: 1,
  },

  // Cliente + OS Data
  clientBox: {
    borderWidth: 0.5,
    borderColor: '#C9CED6',
    borderRadius: 3,
    padding: 8,
  },
  clientName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientInfo: {
    fontSize: 9,
    marginBottom: 2,
    color: '#333333',
  },

  osBox: {
    borderWidth: 0.5,
    borderColor: '#C9CED6',
    borderRadius: 3,
    padding: 8,
  },
  osRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderColor: '#E3E7EB',
    fontSize: 9,
  },
  osRowLast: {
    borderBottomWidth: 0,
  },
  osLabel: {
    color: '#666666',
  },
  osValue: {
    fontWeight: 'bold',
    color: '#111111',
  },

  // Checklist
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    fontSize: 9,
  },
  checklistStatus: {
    width: 40,
    marginRight: 6,
    fontWeight: 'bold',
    fontSize: 8,
    color: '#111111',
  },
  checklistLabel: {
    flex: 1,
    fontSize: 9,
  },
  checklistNote: {
    fontSize: 8,
    color: '#666666',
    marginLeft: 46,
    marginTop: 2,
    fontStyle: 'italic',
  },
  checklistSectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 6,
    marginBottom: 4,
    color: '#333333',
  },

  // Fotos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  photoBox: {
    width: '30%',
    aspectRatio: 4 / 3,
    borderWidth: 0.5,
    borderColor: '#C9CED6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  // Assinaturas
  signatures: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  signatureCol: {
    flex: 1,
    alignItems: 'center',
  },
  signatureTitle: {
    fontWeight: 'bold',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  signatureImage: {
    width: 180,
    height: 60,
    objectFit: 'contain',
    marginBottom: 6,
  },
  signatureLine: {
    width: '70%',
    height: 0.5,
    backgroundColor: '#000000',
    marginVertical: 6,
  },
  signatureLegend: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 1.4,
  },

  // Tabela Financeira
  table: {
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: '#C9CED6',
    borderRadius: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 0.5,
    borderColor: '#C9CED6',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#E3E7EB',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableColDesc: {
    flex: 3,
    fontSize: 8,
  },
  tableColQty: {
    width: 40,
    fontSize: 8,
    textAlign: 'center',
  },
  tableColPrice: {
    width: 60,
    fontSize: 8,
    textAlign: 'right',
  },
  tableColTotal: {
    width: 70,
    fontSize: 8,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#333333',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F9F9F9',
    borderBottomWidth: 0.5,
    borderColor: '#E3E7EB',
  },
  subtotalLabel: {
    fontSize: 9,
    color: '#666666',
  },
  subtotalValue: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#18487A',
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  installmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderColor: '#E3E7EB',
  },
  installmentLabel: {
    fontSize: 8,
    flex: 1,
  },
  installmentDate: {
    fontSize: 8,
    width: 70,
    textAlign: 'center',
  },
  installmentMethod: {
    fontSize: 8,
    width: 70,
    textAlign: 'center',
  },
  installmentAmount: {
    fontSize: 8,
    width: 70,
    textAlign: 'right',
    fontWeight: 'bold',
  },

  // Utilidades
  muted: {
    color: '#666666',
  },
  wrap: {
    wordWrap: 'break-word',
  },
});

// Formatar moeda
const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Componente Header
const Header = ({ company, osNumber }: { company: Report['company']; osNumber: number | string }) => (
  <>
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        {company.logoDataUrl && (
          <Image src={company.logoDataUrl} style={styles.logo} />
        )}
      </View>
      <View style={styles.companyInfo}>
        <Text style={styles.companyName}>{company.name}</Text>
        {(company.cnpj || company.ie) && (
          <Text style={styles.companyText}>
            {company.cnpj && `CNPJ: ${company.cnpj}`}
            {company.cnpj && company.ie && ' | '}
            {company.ie && `IE: ${company.ie}`}
          </Text>
        )}
        {company.site && <Text style={styles.companyText}>{company.site}</Text>}
        {company.email && <Text style={styles.companyText}>{company.email}</Text>}
        {company.phone && <Text style={styles.companyText}>{company.phone}</Text>}
        {company.address && <Text style={styles.companyText}>{company.address}</Text>}
      </View>
    </View>
    <View style={styles.title}>
      <Text>ORDEM DE SERVIÇO Nº {osNumber}</Text>
    </View>
  </>
);

// Componente Section
const Section = ({ title, children, noBorder }: { title: string; children: React.ReactNode; noBorder?: boolean }) => (
  <View style={styles.section} wrap={false}>
    <View style={styles.sectionTitle}>
      <Text>{title}</Text>
    </View>
    {noBorder ? (
      <View style={{ paddingLeft: 8 }}>{children}</View>
    ) : (
      <View style={styles.sectionContent}>{children}</View>
    )}
  </View>
);

// Componente PhotoGrid
const PhotoGrid = ({ photos }: { photos: string[] }) => (
  <View style={styles.photoGrid}>
    {photos.map((url, idx) => (
      <View key={idx} style={styles.photoBox}>
        <Image src={url} style={styles.photo} />
      </View>
    ))}
  </View>
);

// Componente Signatures
const Signatures = ({ signatures }: { signatures: Report['signatures'] }) => (
  <View style={styles.section} wrap={false}>
    <View style={styles.sectionTitle}>
      <Text>ASSINATURAS</Text>
    </View>
    <View style={styles.signatures}>
      {signatures.tech && (
        <View style={styles.signatureCol}>
          <Text style={styles.signatureTitle}>TÉCNICO RESPONSÁVEL</Text>
          {signatures.tech.imageDataUrl && (
            <Image src={signatures.tech.imageDataUrl} style={styles.signatureImage} />
          )}
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLegend}>{signatures.tech.name}</Text>
          {signatures.tech.when && (
            <Text style={styles.signatureLegend}>{signatures.tech.when}</Text>
          )}
        </View>
      )}
      {signatures.client && (
        <View style={styles.signatureCol}>
          <Text style={styles.signatureTitle}>CLIENTE / RESPONSÁVEL</Text>
          {signatures.client.imageDataUrl && (
            <Image src={signatures.client.imageDataUrl} style={styles.signatureImage} />
          )}
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLegend}>{signatures.client.name}</Text>
          {signatures.client.role && (
            <Text style={styles.signatureLegend}>Cargo: {signatures.client.role}</Text>
          )}
          {signatures.client.when && (
            <Text style={styles.signatureLegend}>{signatures.client.when}</Text>
          )}
        </View>
      )}
    </View>
  </View>
);

// Componente Seção Financeira
const FinancialSection = ({ financial }: { financial: NonNullable<Report['financial']> }) => {
  const typeLabels: Record<string, string> = {
    PRODUCT: 'Produtos',
    SERVICE: 'Serviços',
    FEE: 'Taxas',
    DISCOUNT: 'Descontos',
  };

  const productItems = financial.items.filter(i => i.type === 'PRODUCT');
  const serviceItems = financial.items.filter(i => i.type === 'SERVICE');

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <Text>RESUMO FINANCEIRO</Text>
      </View>
      
      {/* Tabela de Itens */}
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableColDesc, styles.tableHeaderText]}>Descrição</Text>
          <Text style={[styles.tableColQty, styles.tableHeaderText]}>Qtd</Text>
          <Text style={[styles.tableColPrice, styles.tableHeaderText]}>Vlr Unit</Text>
          <Text style={[styles.tableColTotal, styles.tableHeaderText]}>Total</Text>
        </View>

        {/* Produtos */}
        {productItems.length > 0 && (
          <>
            <View style={[styles.subtotalRow, { backgroundColor: '#E8F4FD' }]}>
              <Text style={[styles.subtotalLabel, { fontWeight: 'bold' }]}>PRODUTOS</Text>
              <Text style={styles.subtotalValue}></Text>
            </View>
            {productItems.map((item, idx) => (
              <View key={`prod-${idx}`} style={[styles.tableRow, idx === productItems.length - 1 && styles.tableRowLast]}>
                <Text style={styles.tableColDesc}>{item.description}</Text>
                <Text style={styles.tableColQty}>{item.qty}</Text>
                <Text style={styles.tableColPrice}>{formatCurrency(item.unitPrice)}</Text>
                <Text style={styles.tableColTotal}>{formatCurrency(item.total)}</Text>
              </View>
            ))}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal Produtos</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(financial.subtotals.products)}</Text>
            </View>
          </>
        )}

        {/* Serviços */}
        {serviceItems.length > 0 && (
          <>
            <View style={[styles.subtotalRow, { backgroundColor: '#E8FDF4' }]}>
              <Text style={[styles.subtotalLabel, { fontWeight: 'bold' }]}>SERVIÇOS</Text>
              <Text style={styles.subtotalValue}></Text>
            </View>
            {serviceItems.map((item, idx) => (
              <View key={`serv-${idx}`} style={[styles.tableRow, idx === serviceItems.length - 1 && styles.tableRowLast]}>
                <Text style={styles.tableColDesc}>{item.description}</Text>
                <Text style={styles.tableColQty}>{item.qty}</Text>
                <Text style={styles.tableColPrice}>{formatCurrency(item.unitPrice)}</Text>
                <Text style={styles.tableColTotal}>{formatCurrency(item.total)}</Text>
              </View>
            ))}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal Serviços</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(financial.subtotals.services)}</Text>
            </View>
          </>
        )}

        {/* Descontos da OS */}
        {(financial.osDiscounts.partsValue > 0 || financial.osDiscounts.servicesValue > 0 || financial.osDiscounts.totalValue > 0) && (
          <>
            {financial.osDiscounts.partsValue > 0 && (
              <View style={styles.subtotalRow}>
                <Text style={[styles.subtotalLabel, { color: '#DC2626' }]}>
                  Desconto Peças {financial.osDiscounts.partsType === 'percentage' ? `(${financial.osDiscounts.partsValue}%)` : ''}
                </Text>
                <Text style={[styles.subtotalValue, { color: '#DC2626' }]}>
                  -{formatCurrency(financial.osDiscounts.partsType === 'percentage' 
                    ? (financial.subtotals.products * financial.osDiscounts.partsValue / 100)
                    : financial.osDiscounts.partsValue)}
                </Text>
              </View>
            )}
            {financial.osDiscounts.servicesValue > 0 && (
              <View style={styles.subtotalRow}>
                <Text style={[styles.subtotalLabel, { color: '#DC2626' }]}>
                  Desconto Serviços {financial.osDiscounts.servicesType === 'percentage' ? `(${financial.osDiscounts.servicesValue}%)` : ''}
                </Text>
                <Text style={[styles.subtotalValue, { color: '#DC2626' }]}>
                  -{formatCurrency(financial.osDiscounts.servicesType === 'percentage'
                    ? (financial.subtotals.services * financial.osDiscounts.servicesValue / 100)
                    : financial.osDiscounts.servicesValue)}
                </Text>
              </View>
            )}
            {financial.osDiscounts.totalValue > 0 && (
              <View style={styles.subtotalRow}>
                <Text style={[styles.subtotalLabel, { color: '#DC2626' }]}>
                  Desconto Geral {financial.osDiscounts.totalType === 'percentage' ? `(${financial.osDiscounts.totalValue}%)` : ''}
                </Text>
                <Text style={[styles.subtotalValue, { color: '#DC2626' }]}>
                  -{formatCurrency(financial.osDiscounts.totalType === 'percentage'
                    ? ((financial.subtotals.products + financial.subtotals.services) * financial.osDiscounts.totalValue / 100)
                    : financial.osDiscounts.totalValue)}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Total Geral */}
        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>TOTAL GERAL</Text>
          <Text style={styles.grandTotalValue}>{formatCurrency(financial.grandTotal)}</Text>
        </View>
      </View>

      {/* Parcelas */}
      {financial.installments.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <View style={styles.sectionTitle}>
            <Text>CONDIÇÕES DE PAGAMENTO</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.installmentLabel, styles.tableHeaderText]}>Parcela</Text>
              <Text style={[styles.installmentDate, styles.tableHeaderText]}>Vencimento</Text>
              <Text style={[styles.installmentMethod, styles.tableHeaderText]}>Forma</Text>
              <Text style={[styles.installmentAmount, styles.tableHeaderText]}>Valor</Text>
            </View>
            {financial.installments.map((inst, idx) => (
              <View key={idx} style={[styles.installmentRow, idx === financial.installments.length - 1 && styles.tableRowLast]}>
                <Text style={styles.installmentLabel}>
                  {inst.number}/{financial.installments.length}
                </Text>
                <Text style={styles.installmentDate}>{inst.dueDate}</Text>
                <Text style={styles.installmentMethod}>{inst.paymentMethod || '-'}</Text>
                <Text style={styles.installmentAmount}>{formatCurrency(inst.amount)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// Componente Principal
export const OSReport = ({ data }: { data: Report }) => {
  const statusMap: Record<string, string> = {
    pending: 'Aguardando Início',
    in_progress: 'Em Andamento',
    on_hold: 'Com Pendências',
    completed: 'Finalizado',
    cancelled: 'Cancelado',
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <Header company={data.company} osNumber={data.os.number} />

        {/* Cliente + Quadro da OS */}
        <View style={styles.grid2Cols} wrap={false}>
          <View style={[styles.col1, styles.clientBox]}>
            <View style={styles.sectionTitle}>
              <Text>CLIENTE</Text>
            </View>
            <Text style={styles.clientName}>{data.client.name}</Text>
            {(data.client.cnpj || data.client.ie) && (
              <Text style={styles.clientInfo}>
                {data.client.cnpj && `CNPJ: ${data.client.cnpj}`}
                {data.client.cnpj && data.client.ie && ' | '}
                {data.client.ie && `IE: ${data.client.ie}`}
              </Text>
            )}
            {data.client.address && (
              <Text style={styles.clientInfo}>{data.client.address}</Text>
            )}
            {(data.client.phone || data.client.email) && (
              <Text style={styles.clientInfo}>
                {data.client.phone && `Fone: ${data.client.phone}`}
                {data.client.phone && data.client.email && ' — '}
                {data.client.email}
              </Text>
            )}
          </View>

          <View style={[styles.col2, styles.osBox]}>
            <View style={styles.osRow}>
              <Text style={styles.osLabel}>Nº OS</Text>
              <Text style={styles.osValue}>{data.os.number}</Text>
            </View>
            {data.os.issueDate && (
              <View style={styles.osRow}>
                <Text style={styles.osLabel}>Data Emissão</Text>
                <Text style={styles.osValue}>{data.os.issueDate}</Text>
              </View>
            )}
            {data.os.status && (
              <View style={styles.osRow}>
                <Text style={styles.osLabel}>Status</Text>
                <Text style={styles.osValue}>{statusMap[data.os.status] || data.os.status}</Text>
              </View>
            )}
            {data.os.dueDate && (
              <View style={styles.osRow}>
                <Text style={styles.osLabel}>Data Prevista</Text>
                <Text style={styles.osValue}>{data.os.dueDate}</Text>
              </View>
            )}
            {data.os.finishDate && (
              <View style={[styles.osRow, styles.osRowLast]}>
                <Text style={styles.osLabel}>Data Finalização</Text>
                <Text style={styles.osValue}>{data.os.finishDate}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Técnico Responsável */}
        {data.general.technician && (
          <Section title="TÉCNICO RESPONSÁVEL">
            <Text style={styles.sectionText}>{data.general.technician.name}</Text>
          </Section>
        )}

        {/* Agendamento */}
        {data.general.schedule && (
          <Section title="AGENDAMENTO">
            {(data.general.schedule.date || data.general.schedule.time) && (
              <Text style={styles.sectionText}>
                {data.general.schedule.date && `Data: ${data.general.schedule.date}`}
                {data.general.schedule.date && data.general.schedule.time && ' • '}
                {data.general.schedule.time && `Hora: ${data.general.schedule.time}`}
              </Text>
            )}
            {data.general.schedule.startedAt && (
              <Text style={[styles.sectionText, styles.muted]}>
                Iniciado em: {data.general.schedule.startedAt}
              </Text>
            )}
          </Section>
        )}

        {/* Equipamento + Nº de Série */}
        {data.general.equipment && (
          <View style={styles.grid2Cols} wrap={false}>
            <View style={styles.colEquip}>
              <Section title="EQUIPAMENTO">
                <Text style={styles.sectionText}>{data.general.equipment}</Text>
              </Section>
            </View>
            <View style={styles.colSerial}>
              <Section title="Nº DE SÉRIE">
                <Text style={styles.sectionText}>
                  {data.general.serialNumber || '—'}
                </Text>
              </Section>
            </View>
          </View>
        )}

        {/* Problema */}
        {data.general.problemDescription && (
          <Section title="PROBLEMA">
            <Text style={styles.sectionText}>{data.general.problemDescription}</Text>
          </Section>
        )}

        {/* Tipo de Serviço */}
        {data.general.serviceType && (
          <Section title="TIPO DE SERVIÇO">
            <Text style={styles.sectionText}>{data.general.serviceType}</Text>
          </Section>
        )}

        {/* Checklist */}
        {data.checklist && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionTitle}>
              <Text>CHECKLIST — {data.checklist.title}</Text>
            </View>
            {(data.checklist.filledBy || data.checklist.filledAt) && (
              <Text style={[styles.muted, { fontSize: 8, marginBottom: 6 }]}>
                {data.checklist.filledBy && `Preenchido por: ${data.checklist.filledBy}`}
                {data.checklist.filledBy && data.checklist.filledAt && ' • '}
                {data.checklist.filledAt}
              </Text>
            )}
            {data.checklist.sections.map((section, sIdx) => (
              <View key={sIdx}>
                {section.title && (
                  <Text style={styles.checklistSectionTitle}>{section.title}</Text>
                )}
                {section.items.map((item, iIdx) => (
                  <View key={iIdx}>
                    <View style={styles.checklistItem}>
                      <Text style={styles.checklistStatus}>[{item.status}]</Text>
                      <Text style={styles.checklistLabel}>{item.label}</Text>
                    </View>
                    {item.note && (
                      <Text style={styles.checklistNote}>{item.note}</Text>
                    )}
                    {item.photos && item.photos.length > 0 && (
                      <View style={{ marginLeft: 46, marginTop: 4, marginBottom: 6 }}>
                        <PhotoGrid photos={item.photos} />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Análises e Providências */}
        {data.technical.analysisAndActions && (
          <Section title="ANÁLISES E PROVIDÊNCIAS REALIZADAS">
            <Text style={styles.sectionText}>{data.technical.analysisAndActions}</Text>
          </Section>
        )}

        {/* Anotações Gerais */}
        {data.general.notes && (
          <Section title="ANOTAÇÕES GERAIS">
            <Text style={styles.sectionText}>{data.general.notes}</Text>
          </Section>
        )}

        {/* FOTOS ANTES DA MANUTENÇÃO */}
        {(data.photos?.before && ((data.photos.before.images?.length ?? 0) > 0 || (data.photos.before.videos?.length ?? 0) > 0)) && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionTitle}>
              <Text>FOTOS ANTES DA MANUTENÇÃO</Text>
            </View>
            
            {/* Renderizar fotos se houver */}
            {(data.photos.before.images?.length ?? 0) > 0 && (
              <PhotoGrid photos={data.photos.before.images} />
            )}
            
            {/* Renderizar aviso de vídeos se houver */}
            {(data.photos.before.videos?.length ?? 0) > 0 && (
              <Text style={[styles.sectionText, { marginTop: 8, fontSize: 9, color: '#666' }]}>
                Vídeos anexados{data.photos.before.videos.length > 1 ? ` (${data.photos.before.videos.length})` : ''}
              </Text>
            )}
          </View>
        )}

        {/* FOTOS APÓS A MANUTENÇÃO */}
        {(data.photos?.after && ((data.photos.after.images?.length ?? 0) > 0 || (data.photos.after.videos?.length ?? 0) > 0)) && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionTitle}>
              <Text>FOTOS APÓS A MANUTENÇÃO</Text>
            </View>
            
            {/* Renderizar fotos se houver */}
            {(data.photos.after.images?.length ?? 0) > 0 && (
              <PhotoGrid photos={data.photos.after.images} />
            )}
            
            {/* Renderizar aviso de vídeos se houver */}
            {(data.photos.after.videos?.length ?? 0) > 0 && (
              <Text style={[styles.sectionText, { marginTop: 8, fontSize: 9, color: '#666' }]}>
                Vídeos anexados{data.photos.after.videos.length > 1 ? ` (${data.photos.after.videos.length})` : ''}
              </Text>
            )}
          </View>
        )}

        {/* SEÇÃO FINANCEIRA (apenas para relatório completo) */}
        {data.financial && (
          <FinancialSection financial={data.financial} />
        )}

        {/* Assinaturas (sempre por último) */}
        {(data.signatures.tech || data.signatures.client) && (
          <Signatures signatures={data.signatures} />
        )}
      </Page>
    </Document>
  );
};
