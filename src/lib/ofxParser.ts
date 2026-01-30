// OFX Parser - parses OFX bank statement files
export interface OFXTransaction {
  fitId: string;
  date: string;
  amount: number;
  description: string;
  type: string;
}

export interface OFXStatement {
  bankId: string;
  accountId: string;
  accountType: string;
  startDate: string;
  endDate: string;
  balance: number;
  transactions: OFXTransaction[];
}

function parseOFXDate(dateStr: string): string {
  // OFX dates are in format YYYYMMDDHHMMSS or YYYYMMDD
  if (!dateStr || dateStr.length < 8) return "";
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}

function extractTagValue(content: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<\\n]+)`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

function extractTagContent(content: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = content.match(regex);
  return match ? match[1] : "";
}

export function parseOFX(content: string): OFXStatement | null {
  try {
    // Clean up the content - remove SGML header
    const ofxStart = content.indexOf("<OFX>");
    if (ofxStart === -1) return null;
    const ofxContent = content.substring(ofxStart);

    // Extract statement info
    const stmtrs = extractTagContent(ofxContent, "STMTRS") || 
                   extractTagContent(ofxContent, "CCSTMTRS");
    
    if (!stmtrs) return null;

    // Bank account info
    const bankAcctFrom = extractTagContent(stmtrs, "BANKACCTFROM") ||
                         extractTagContent(stmtrs, "CCACCTFROM");
    
    const bankId = extractTagValue(bankAcctFrom, "BANKID") || 
                   extractTagValue(bankAcctFrom, "ORG") || "";
    const accountId = extractTagValue(bankAcctFrom, "ACCTID") || "";
    const accountType = extractTagValue(bankAcctFrom, "ACCTTYPE") || "CHECKING";

    // Transaction list
    const tranList = extractTagContent(stmtrs, "BANKTRANLIST") ||
                     extractTagContent(stmtrs, "CCSTMTRS");
    
    const startDate = parseOFXDate(extractTagValue(tranList, "DTSTART"));
    const endDate = parseOFXDate(extractTagValue(tranList, "DTEND"));

    // Balance
    const ledgerBal = extractTagContent(stmtrs, "LEDGERBAL") ||
                      extractTagContent(stmtrs, "AVAILBAL");
    const balance = parseFloat(extractTagValue(ledgerBal, "BALAMT") || "0");

    // Parse transactions
    const transactions: OFXTransaction[] = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = stmtTrnRegex.exec(ofxContent)) !== null) {
      const trn = match[1];
      const trnType = extractTagValue(trn, "TRNTYPE");
      const datePosted = parseOFXDate(extractTagValue(trn, "DTPOSTED"));
      const amount = parseFloat(extractTagValue(trn, "TRNAMT") || "0");
      const fitId = extractTagValue(trn, "FITID");
      const name = extractTagValue(trn, "NAME");
      const memo = extractTagValue(trn, "MEMO");
      const description = name || memo || `${trnType} transaction`;

      transactions.push({
        fitId,
        date: datePosted,
        amount,
        description,
        type: trnType,
      });
    }

    return {
      bankId,
      accountId,
      accountType,
      startDate,
      endDate,
      balance,
      transactions,
    };
  } catch (e) {
    console.error("Error parsing OFX:", e);
    return null;
  }
}
