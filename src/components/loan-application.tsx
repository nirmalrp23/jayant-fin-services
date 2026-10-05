"use client";
/* Applicant uploads use data URLs so the photo remains available for printing. */
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { BrandLogo } from "./brand-logo";

function Field({
  label,
  name,
  multiline = false,
}: {
  label: string;
  name: string;
  multiline?: boolean;
}) {
  return (
    <label className={`loan-field ${multiline ? "loan-field-address" : ""}`}>
      <span>{label} :</span>
      {multiline ? (
        <textarea name={name} aria-label={label} rows={2} />
      ) : (
        <input name={name} aria-label={label} type="text" />
      )}
    </label>
  );
}
function Choices({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <fieldset className="loan-choices">
      <legend>{label} :</legend>
      {options.map((option) => (
        <label key={option}>
          <input type="radio" name={name} value={option} />
          {option}
        </label>
      ))}
    </fieldset>
  );
}
function Signature({ label }: { label: string }) {
  return (
    <div className="loan-signature">
      <span />
      {label}
    </div>
  );
}

export function LoanApplication() {
  const form = useRef<HTMLFormElement>(null);
  const [photo, setPhoto] = useState("");
  const [message, setMessage] = useState("");
  return (
    <div className="loan-application">
      <div className="loan-form-toolbar">
        <p>கடன் விண்ணப்பம் · Legal paper (8.5 × 14 in)</p>
        <div className="flex gap-3">
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              form.current?.reset();
              setPhoto("");
              setMessage("");
            }}
          >
            Clear entries
          </button>
          <button
            className="btn-primary"
            type="button"
            onClick={() => window.print()}
          >
            Print Legal / Save PDF
          </button>
        </div>
      </div>
      {message && <p role="status">{message}</p>}
      <form
        ref={form}
        onSubmit={(event) => event.preventDefault()}
        autoComplete="off"
      >
        <section
          className="loan-form-sheet"
          aria-label="Loan application page 1"
          lang="ta"
        >
          <header className="loan-document-header">
            <div>
              <div className="loan-document-brand">
                <BrandLogo />
                <h2>ஜெயந்த் பின் சர்வீஸ்</h2>
              </div>
              <p>(கடன் விண்ணப்பம்)</p>
              <Field label="கிளையின் பெயர்" name="branch" />
              <Field label="மையத்தின் பெயர்" name="center" />
              <p className="loan-type">கடன் வகை : பொதுக்கடன்</p>
            </div>
            <label className="loan-photo">
              <span className="sr-only">Upload applicant photo</span>
              {photo ? (
                <img src={photo} alt="Applicant photo" />
              ) : (
                <span>புகைப்படம்</span>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (
                    !["image/jpeg", "image/png", "image/webp"].includes(
                      file.type,
                    ) ||
                    file.size > 5 * 1024 * 1024
                  ) {
                    setMessage("Choose a JPG, PNG or WebP photo up to 5 MB.");
                    event.target.value = "";
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    setPhoto(String(reader.result));
                    setMessage("");
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </header>
          <div className="loan-columns loan-details">
            <div>
              <h3>உறுப்பினர் விவரம்</h3>
              <Field label="உறுப்பினர் பெயர்" name="member-name" />
              <Field label="வயது" name="member-age" />
              <Field label="தொழில்" name="member-job" />
              <Field label="வருமானம்" name="member-income" />
              <Field label="ஆதார் எண்" name="member-aadhaar" />
              <Field label="முகவரி" name="member-address" multiline />
            </div>
            <div>
              <h3>உத்தரவாதம் அளிப்பவர் விவரம்</h3>
              <Field label="பெயர்" name="guarantor-name" />
              <Field label="வயது" name="guarantor-age" />
              <Field label="தொழில்" name="guarantor-job" />
              <Field label="வருமானம்" name="guarantor-income" />
              <Field label="உறவுமுறை" name="guarantor-relation" />
              <Field label="ஆதார் எண்" name="guarantor-aadhaar" />
              <Field label="முகவரி" name="guarantor-address" multiline />
            </div>
          </div>
          <Choices
            label="உறுப்பினர் வசிக்கும் இடம்"
            name="location"
            options={["கிராமம்", "நகரம் சார்ந்த பகுதி", "நகரம்"]}
          />
          <Choices
            label="வீடு"
            name="home"
            options={["சொந்த வீடு", "போக்கியம் வீடு", "வாடகை வீடு"]}
          />
          <Field label="தற்போதுள்ள கடன் விவரங்கள்" name="existing-loans" />
          <div className="loan-columns loan-loan-details">
            <div>
              <h3>விண்ணப்பிக்கும் கடன் விவரம் :</h3>
              <Field label="கடன் தொகை" name="requested-amount" />
              <Field label="கடனுக்கான காரணம்" name="loan-purpose" />
              <p>கடன் திரும்ப செலுத்த விரும்பும் தொகை மற்றும்</p>
              <Field label="காலம்" name="repayment-period" />
              <Field label="தொகை" name="repayment-amount" />
            </div>
            <div>
              <h3>முந்தைய கடன் விவரம் :</h3>
              <Choices
                label="கடந்த கடனில் உறுப்பினரின் திரும்ப செலுத்தும் திறன்"
                name="previous-ability"
                options={["நன்று", "இல்லை"]}
              />
              <p>முந்தைய கடனை குறிப்பிட்ட காரணத்திற்காக மட்டுமே</p>
              <Choices
                label="பயன்படுத்தப்பட்டதா ?"
                name="previous-use"
                options={["ஆம்", "இல்லை"]}
              />
              <Choices
                label="சரியான காலத்திற்குள் கட்டி முடிக்கப்பட்டதா ?"
                name="previous-completed"
                options={["ஆம்", "இல்லை"]}
              />
            </div>
          </div>
          <div className="loan-clause">
            <h3>உறுப்பினர் உறுதிமொழி:</h3>
            <p>
              ஜெயந்த் பின் சர்வீஸ் நிறுவனத்தின் உறுப்பினராகிய நான் வாங்கும் இந்த
              பொதுக் கடன் முழுவதும் எனது குடும்ப வருமானத்தையும் தொழிலையும்
              பெருக்குவதற்கான நடவடிக்கைகளுக்காக அதாவது இந்த கடன் விண்ணப்பத்தில்
              கூறியுள்ள கடன் காரணத்திற்காக மட்டுமே பயன்படுத்துவேன் எனவும் மேலும்
              இந்த விண்ணப்பத்தில் கொடுக்கப்பட்டுள்ள அனைத்து விவரங்களும் மற்றும்
              ஜெயந்த் பின் சர்வீஸ் அல்லாத பிற நிறுவனங்களிடமிருந்து பெற்ற கடன்
              பற்றிய விவரங்கள் உண்மையானவை என நாணயத்துடன் உறுதியளிக்கிறேன்.
            </p>
          </div>
          <Signature label="உறுப்பினர் கையொப்பம்" />
          <div className="loan-clause">
            <h3>குழு உறுப்பினர்களின் உறுதிமொழி:</h3>
            <p>
              மேற்குறிப்பிட்ட கடன் விண்ணப்பதாரர் ஆகிய எங்கள் குழு உறுப்பினர்
              தெரிவித்த விவரங்களான இதுவரை பெற்ற கடன் எண்ணிக்கை கடன் தொகை குடும்ப
              வருமானம் மற்றும் இதர விவரங்கள் அனைத்தும் உண்மையானவை அறிகிறோம்.
              மேலும் தாங்கள் பரிந்துரை செய்யும் இந்த கடன் தொகையை மேற்கண்ட
              உறுப்பினரே பெற்று அவரது தொழில் சம்பந்தமான நடவடிக்கைகளுக்கு மட்டுமே
              பயன்படுத்துவார் எனவும், மேலும் அவர் இந்த கடனை கட்ட தவறினால் அந்த
              கடன் தொகை முழுவதும் திரும்ப செலுத்த குழு உறுப்பினர்கள் மற்றும்
              எங்களது உத்தரவாதங்கள் அனைவரும் முழு பொறுப்பேற்கிறோம் மேலும்
              முன்னின்று செலுத்துவோம் என உறுதி அளிக்கிறோம். ஆகையால் மேற்கண்ட
              உறுப்பினருக்கு தாங்கள் கடன் வழங்க முழு மனதோடு சம்மதம்
              தெரிவிக்கிறோம்.
            </p>
          </div>
          <div className="loan-columns loan-group">
            <div>
              <div className="loan-group-line">
                <span>1.</span>
                <span />
              </div>
              <div className="loan-group-line">
                <span>2.</span>
                <span />
              </div>
            </div>
            <div>
              <div className="loan-group-line">
                <span>3.</span>
                <span />
              </div>
              <div className="loan-group-line">
                <span>4.</span>
                <span />
              </div>
            </div>
          </div>
          <Signature label="மையத்தலைவி கையொப்பம்" />
        </section>
        <section
          className="loan-form-sheet loan-form-back"
          aria-label="Loan application page 2"
          lang="ta"
        >
          <div className="loan-clause">
            <h3>உரிமை மாற்றுவதற்கான ஒப்புதல் படிவம்:</h3>
            <p>
              ஜெயந்த் பின் சர்வீஸ் நிறுவனத்திடம் இருந்து நான் பெற்ற கடன்
              தொகைக்காக எழுதிக் கொடுத்த ஆவணங்களின் அடிப்படையில், ஜெயந்த் பின்
              சர்வீஸ் நிறுவனத்திற்குரிய உங்களது உரிமைகள் மற்றும் பொறுப்புகளை
              முழுமையாகவோ அல்லது அதன் ஒரு பகுதியையோ வேறு எந்த நிறுவனத்திற்கோ
              அல்லது நபருக்கோ விற்கவோ, தரக்கூடு செய்யவோ, பிணையாக வைக்கவோ, உரிமை
              மாற்றம் செய்யவோ, அல்லது வேறு ஏதேனும் ஒப்பந்தம் செய்து கொள்ளவோ
              மேற்படி ஜெயந்த் பின் சர்வீஸ் நிறுவனத்திற்கு செயல்படுத்தும்
              பட்சத்தில், ஜெயந்த் பின் சர்வீஸ் நிறுவனத்திற்குரிய யாவித
              கட்டளைகளான விதிமுறைகள் மற்றும் நிபந்தனைகள் மேற்கூறிய எல்லா
              சூழ்நிலைகளிலும் என்னை அல்லது எங்களை தொடர்ந்து கட்டுப்படுத்தும்
              என்று நானும் உத்தரவாதம் அளிப்பவரும் உறுதி அளிக்கிறோம்.
            </p>
          </div>
          <div className="loan-columns loan-signature-pair">
            <Signature label="உத்தரவாதர் கையொப்பம்" />
            <Signature label="உறுப்பினர் கையொப்பம்" />
          </div>
          <div className="loan-clause">
            <h3>கடனுறுதி சீட்டு :</h3>
            <p className="loan-inline">
              ஜெயந்த் பின் சர்வீஸ் நிறுவனத்திலிருந்து திரு/திருமதி/செல்வி{" "}
              <input aria-label="கடனுறுதி சீட்டு பெயர்" name="note-name" /> என்ற
              நான் <input aria-label="கடனுறுதி சீட்டு தேதி" name="note-date" />{" "}
              தேதியில் எனது சொந்த தேவையான{" "}
              <input aria-label="கடனுறுதி சீட்டு காரணம்" name="note-purpose" />{" "}
              என்ற காரணத்திற்காக ரூபாய்{" "}
              <input aria-label="கடனுறுதி சீட்டு தொகை" name="note-amount" />{" "}
              கடனாக பெற்றுக் கொண்டேன் எனவும் முதன்மை கடன் தாரராகிய நான் வாங்கிய
              கடனுக்கான அசல் மற்றும் வட்டியையும் சேர்த்து உங்களுக்கோ அல்லது
              தங்கள் உத்தரவு பெற்றவர்களுக்கோ அவர்கள் வேண்டும்போது திரும்ப
              செலுத்துவேன் எனவும் எனது கடன் தொகை முடியும் காலம் வரை இந்த கடன்
              உறுதி சீட்டு என்னை கட்டுப்படுத்தும் என்பதனையும் நான் அறிவேன் என்று
              உறுதி அளிக்கிறேன்.
            </p>
          </div>
          <Signature label="உறுப்பினர் கையொப்பம்" />
          <div className="loan-clause">
            <h3>உத்தரவாதம் அளிப்பவர் விவரம் மற்றும் ஒப்புதல் :</h3>
            <div className="loan-guarantor-inline">
              <Field label="உத்தரவாதம் அளிப்பவரின் பெயர்" name="consent-name" />
              <Field label="உறவுமுறை" name="consent-relation" />
              <Field label="வயது" name="consent-age" />
            </div>
            <Field label="முகவரி" name="consent-address" />
            <p>
              பின் சர்வீஸ் நிறுவனத்திலிருந்து மேலே குறிப்பிட்டுள்ள திருமதி /
              செல்வி வாங்கிய கடனுக்கான கடன் உறுதிச் சீட்டு மற்றும் உரிமை
              மாற்றுவதற்கான ஒப்புதல் படிவம் ஆகிய ஆவணங்களில் குறிப்பிட்ட
              நிபந்தனைகள் மற்றும் விதிமுறைகள் அனைத்தும் மேற்கண்ட முதன்மை கடன்
              தாரரையும், இதை ஒப்புக்கொண்டு இணைவாகில் கையொப்பமிட்டுள்ள உத்தரவாதம்
              அளிப்பவரான என்னையும் கூட்டாகவும் மற்றும் தனித்தனியாகவும்
              கட்டுப்படுத்தும் என்பதையும் அறிவேன் என்று உறுதி அளிக்கிறேன்.
            </p>
          </div>
          <Signature label="உத்தரவாதம் அளிப்பவரின் கையொப்பம்" />
          <div className="loan-clause">
            <h3>கடன் அனுமதிக்கான படிவம்:</h3>
            <p>
              இந்த கடன் விண்ணப்பத்தில் விவரங்கள் அனைத்தும் முழுமையாக
              சரிபார்க்கப்பட்டது. மேலும் இந்த உறுப்பினர் இதுவரை பெற்றுள்ள
              கடன்கள் அனைத்தும் பயன்படுத்தி அதிலிருந்து வருமானத்தை பெருக்கி
              குடும்ப முன்னேற்றம் அடைய செய்யவும் மேலும் காலம் தவறாமல்
              செலுத்தவும் தகுதிக்கு உடையவர் எனவே இந்த கடனை வழங்க நாங்கள்
              சம்மதிக்கிறோம்.
            </p>
          </div>
          <div className="loan-approved">
            <Field label="கடன் தொகை" name="approved-amount" />
          </div>
          <div className="loan-columns loan-final-signatures">
            <Signature label="கடன் மேலாளர் கையொப்பம்" />
            <Signature label="கிளை மேலாளர் கையொப்பம்" />
          </div>
        </section>
      </form>
    </div>
  );
}
