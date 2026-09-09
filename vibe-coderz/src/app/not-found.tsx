import { Button, Label } from "@/components/studio/Shared";
export default function NotFound() {
  return (
    <section className="shell not-found">
      <Label>404 / OFF ORBIT</Label>
      <h1>A little off course.</h1>
      <p>This page doesn’t exist. Let’s get you back to something useful.</p>
      <Button href="/">Back to the studio</Button>
    </section>
  );
}
