import { AcknowledgementEditor } from "@/components/acknowledgement-editor";
import { Heading } from "@/components/page-parts";
import { identity } from "@/lib/auth";

export default async function Page() {
  await identity();
  return (
    <div className="ack-page">
      <div className="ack-screen-only">
        <Heading
          title="Gold coin acknowledgement"
          description="Create member slips, preview details, and download a print-ready PDF."
        />
      </div>
      <AcknowledgementEditor />
    </div>
  );
}
