import { DetailRow } from "../DetailRow.jsx";
import styles from "../../REDMS.module.css";

export function CpinTab({ inp, formatAddress }) {
    return (
        <div className={styles.two} style={{ marginTop: 12 }} role="tabpanel" id="panel-cpin" aria-labelledby="tab-cpin">
            <div className={styles.panel}>
                <div className={styles.ph}>CPIN LP Offering Summary · Section 4(a)(2)</div>
                <DetailRow label="Targeted Annual ROI" val="7% – 9%" cls="a" />
                <DetailRow label="Minimum Investment" val="$500" />
                <DetailRow label="Distribution Frequency" val="Quarterly" />
                <DetailRow label="LP Structure" val="Non-voting Limited Partner" />
                <DetailRow label="Property Management" val="Great Lakes PMG" />
                <DetailRow label="Tenant Type" val="Section 8 / HUD Voucher" />
                <DetailRow label="Securities Exemption" val="Section 4(a)(2)" cls="a" />
                <DetailRow label="Expected Minimum Hold" val="2+ Years" />
                <DetailRow label="KYC / AML Required" val="Yes (CPIN onboarding)" />
                <DetailRow
                    label="Sophisticated Investor Req."
                    val="Yes (edu module)"
                    tot
                    div
                />
                <DetailRow
                    label="Property"
                    val={`${inp.bedrooms}BR / ${inp.bathrooms}BA · ${Number(inp.sqft).toLocaleString()} sf`}
                />
                <DetailRow label="Year Built" val={inp.yearBuilt} />
                <DetailRow label="Address" val={formatAddress(inp)} />
            </div>
        </div>
    );
}
