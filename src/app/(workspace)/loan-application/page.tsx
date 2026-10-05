import { Heading } from "@/components/page-parts";
import { LoanApplication } from "@/components/loan-application";

export default function Page() {
  return (
    <>
      <div className="loan-application-heading">
        <Heading
          title="Loan application"
          description="Complete the original Tamil form, then print both pages. Entries are kept only on this page until you leave or refresh."
        />
      </div>
      <LoanApplication />
    </>
  );
}
