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
interface OSReportData {
  osNumber: number;
  company: {
    name: string;
    cnpj: string;
    ie: string;
    address: string;
    website: string;
    email: string;
    phone: string;
    logoUrl?: string;
  };
  client: {
    name: string;
    cpfCnpj: string;
    ie: string;
    address: string;
    city: string;
    state: string;
    cep: string;
    phone: string;
    email: string;
  };
  os: {
    number: number;
    createdAt: string;
    status: string;
    scheduledDate: string;
    finishedAt?: string;
  };
  technician: {
    name: string;
    phone: string;
  };
  scheduling: {
    date: string;
    time: string;
    startedAt?: string;
    serviceType: string;
  };
  equipment: {
    description: string;
    serialNumber: string;
  };
  problem: string;
  servicesPerformed: string;
  parts: string;
  notes: string;
  checklist: {
    items: Array<{ id: string; text: string }>;
    responses: Record<string, boolean>;
  };
  photos: string[];
  signatures: {
    technician: {
      name: string;
      url: string;
      date: string;
    };
    customer: {
      name: string;
      position: string;
      url: string;
      date: string;
    };
  };
}

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
    width: 60,
  },
  logo: {
    width: 50,
    height: 40,
    objectFit: 'contain',
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
    alignItems: 'center',
    marginBottom: 4,
    fontSize: 9,
  },
  checklistIcon: {
    width: 12,
    height: 12,
    marginRight: 6,
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
    marginTop: 36,
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

  // Utilidades
  muted: {
    color: '#666666',
  },
  wrap: {
    wordWrap: 'break-word',
  },
});

// Componente Header
const Header = ({ company, osNumber }: { company: OSReportData['company']; osNumber: number }) => (
  <>
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        {company.logoUrl && (
          <Image src={company.logoUrl} style={styles.logo} />
        )}
      </View>
      <View style={styles.companyInfo}>
        <Text style={styles.companyName}>{company.name}</Text>
        <Text style={styles.companyText}>CNPJ: {company.cnpj} | IE: {company.ie}</Text>
        <Text style={styles.companyText}>{company.website}</Text>
        <Text style={styles.companyText}>{company.email}</Text>
        <Text style={styles.companyText}>{company.phone}</Text>
        <Text style={styles.companyText}>{company.address}</Text>
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
const Signatures = ({ signatures }: { signatures: OSReportData['signatures'] }) => (
  <View style={styles.signatures} wrap={false}>
    <View style={styles.signatureCol}>
      <Text style={styles.signatureTitle}>TÉCNICO</Text>
      {signatures.technician.url && (
        <Image src={signatures.technician.url} style={styles.signatureImage} />
      )}
      <View style={styles.signatureLine} />
      <Text style={styles.signatureLegend}>{signatures.technician.name}</Text>
      {signatures.technician.date && (
        <Text style={styles.signatureLegend}>{signatures.technician.date}</Text>
      )}
    </View>
    <View style={styles.signatureCol}>
      <Text style={styles.signatureTitle}>CLIENTE</Text>
      {signatures.customer.url && (
        <Image src={signatures.customer.url} style={styles.signatureImage} />
      )}
      <View style={styles.signatureLine} />
      <Text style={styles.signatureLegend}>{signatures.customer.name}</Text>
      {signatures.customer.position && (
        <Text style={styles.signatureLegend}>Cargo: {signatures.customer.position}</Text>
      )}
      {signatures.customer.date && (
        <Text style={styles.signatureLegend}>{signatures.customer.date}</Text>
      )}
    </View>
  </View>
);

// Componente Principal
export const OSReport = ({ data }: { data: OSReportData }) => {
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
        <Header company={data.company} osNumber={data.osNumber} />

        {/* Cliente + Quadro da OS */}
        <View style={styles.grid2Cols} wrap={false}>
          <View style={[styles.col1, styles.clientBox]}>
            <View style={styles.sectionTitle}>
              <Text>CLIENTE</Text>
            </View>
            <Text style={styles.clientName}>{data.client.name}</Text>
            <Text style={styles.clientInfo}>
              CNPJ: {data.client.cpfCnpj} | IE: {data.client.ie}
            </Text>
            <Text style={styles.clientInfo}>
              {data.client.address} — {data.client.city}/{data.client.state} — CEP {data.client.cep}
            </Text>
            <Text style={styles.clientInfo}>
              Fone: {data.client.phone} — {data.client.email}
            </Text>
          </View>

          <View style={[styles.col2, styles.osBox]}>
            <View style={styles.osRow}>
              <Text style={styles.osLabel}>Nº OS</Text>
              <Text style={styles.osValue}>{data.os.number}</Text>
            </View>
            <View style={styles.osRow}>
              <Text style={styles.osLabel}>Data Emissão</Text>
              <Text style={styles.osValue}>{data.os.createdAt}</Text>
            </View>
            <View style={styles.osRow}>
              <Text style={styles.osLabel}>Status</Text>
              <Text style={styles.osValue}>{statusMap[data.os.status] || data.os.status}</Text>
            </View>
            <View style={styles.osRow}>
              <Text style={styles.osLabel}>Data Prevista</Text>
              <Text style={styles.osValue}>{data.os.scheduledDate}</Text>
            </View>
            <View style={[styles.osRow, styles.osRowLast]}>
              <Text style={styles.osLabel}>Data Finalização</Text>
              <Text style={styles.osValue}>{data.os.finishedAt || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Técnico Responsável */}
        <Section title="TÉCNICO RESPONSÁVEL">
          <Text style={styles.sectionText}>{data.technician.name}</Text>
        </Section>

        {/* Agendamento */}
        <Section title="AGENDAMENTO">
          <Text style={styles.sectionText}>
            Data: {data.scheduling.date} • Hora: {data.scheduling.time}
          </Text>
          {data.scheduling.startedAt && (
            <Text style={[styles.sectionText, styles.muted]}>Iniciado em: {data.scheduling.startedAt}</Text>
          )}
          {data.scheduling.serviceType && (
            <Text style={[styles.sectionText, styles.muted]}>Tipo: {data.scheduling.serviceType}</Text>
          )}
        </Section>

        {/* Equipamento + Nº de Série */}
        <View style={styles.grid2Cols} wrap={false}>
          <View style={styles.colEquip}>
            <Section title="EQUIPAMENTO">
              <Text style={styles.sectionText}>{data.equipment.description || '—'}</Text>
            </Section>
          </View>
          <View style={styles.colSerial}>
            <Section title="Nº DE SÉRIE">
              <Text style={styles.sectionText}>{data.equipment.serialNumber || '—'}</Text>
            </Section>
          </View>
        </View>

        {/* Problema */}
        {data.problem && (
          <Section title="PROBLEMA">
            <Text style={styles.sectionText}>{data.problem}</Text>
          </Section>
        )}

        {/* Serviços Executados */}
        {data.servicesPerformed && (
          <Section title="SERVIÇOS EXECUTADOS">
            <Text style={styles.sectionText}>{data.servicesPerformed}</Text>
          </Section>
        )}

        {/* Peças Utilizadas */}
        <Section title="PEÇAS UTILIZADAS">
          <Text style={[styles.sectionText, styles.muted]}>{data.parts}</Text>
        </Section>

        {/* Checklist */}
        {data.checklist.items.length > 0 && (
          <Section title="CHECKLIST" noBorder>
            {data.checklist.items.map((item) => (
              <View key={item.id} style={styles.checklistItem}>
                <Text style={styles.checklistIcon}>
                  {data.checklist.responses[item.id] ? '☑' : '☐'}
                </Text>
                <Text style={styles.sectionText}>{item.text}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* Fotos */}
        {data.photos.length > 0 && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionTitle}>
              <Text>FOTOS</Text>
            </View>
            <PhotoGrid photos={data.photos} />
          </View>
        )}

        {/* Assinaturas */}
        {(data.signatures.technician.url || data.signatures.customer.url) && (
          <Signatures signatures={data.signatures} />
        )}
      </Page>
    </Document>
  );
};
