import Link from "next/link";
import { examplePrivacyDetails, readPrivacyDetails } from "@/lib/privacy";

export default async function PrivacyPage() {
  const { responsible_name, contact_email, retention_months } = await readPrivacyDetails() ?? examplePrivacyDetails;
  return <main className="mx-auto max-w-3xl space-y-6 p-6 py-12">
    <Link className="text-cyan-800 underline" href="/">Aqua Monitor</Link>
    <h1 className="text-3xl font-bold">Privacidad y uso de datos</h1>
    <p>Esta plataforma académica organiza mediciones ambientales por estación y cuenta de usuario.</p>
    <section className="panel space-y-3"><h2 className="text-xl font-semibold">Datos y finalidad</h2><p>Se utilizan correo de acceso, nombre de perfil, estaciones asociadas, ubicación escrita por su propietario, mediciones, fechas y eventos. Sirven para autenticar, controlar permisos, mostrar tendencias y consultar el historial. Evita incluir domicilios particulares o información sensible en los nombres y ubicaciones.</p></section>
    <section className="panel space-y-3"><h2 className="text-xl font-semibold">Acceso y servicios</h2><p>El propietario y los lectores autorizados acceden a su estación. Supabase proporciona autenticación y almacenamiento; Vercel aloja la aplicación. Los administradores técnicos pueden necesitar acceso para mantener el servicio. La credencial de cada dispositivo es independiente de las cuentas.</p></section>
    <section className="panel space-y-3"><h2 className="text-xl font-semibold">Sesión y exportaciones</h2><p>Se usan cookies necesarias para mantener la sesión. Quien descarga archivos CSV es responsable de conservarlos y compartirlos adecuadamente. No publiques tokens, contraseñas ni capturas que los incluyan.</p></section>
    <section className="panel space-y-3">
      <h2 className="text-xl font-semibold">Responsable, conservación y solicitudes</h2>
      <dl className="grid gap-3">
        <div><dt className="font-semibold">Equipo responsable</dt><dd>{responsible_name}</dd></div>
        <div><dt className="font-semibold">Correo de contacto</dt><dd>{contact_email ?
          <a className="text-cyan-800 underline" href={`mailto:${encodeURIComponent(contact_email).replace("%40", "@")}`}>{contact_email}</a> :
          "Por confirmar"}</dd></div>
        <div><dt className="font-semibold">Plazo de conservación</dt><dd>{retention_months === null ?
          "Por confirmar" : `${retention_months} ${retention_months === 1 ? "mes" : "meses"}`}</dd></div>
      </dl>
      <p>Para solicitar acceso, corrección o eliminación, {contact_email ?
        "escribe al correo de contacto indicado arriba." :
        "contacta al responsable que te proporcionó acceso al proyecto."}</p>
      <p>No hay borrado automático por antigüedad ni eliminación de cuentas desde esta interfaz. La eliminación debe coordinarse con los procedimientos de copias de seguridad.</p>
    </section>
    <section className="panel space-y-3"><h2 className="text-xl font-semibold">Interpretación de sensores</h2><p>El estado de luz 0/1 depende de la escala y umbral seleccionados. El porcentaje del MQ-135 representa escala eléctrica; no es concentración ni identificación de gases.</p></section>
    <Link className="btn" href="/dashboard">Volver al dashboard</Link>
  </main>;
}
