import { useState, type FormEvent } from 'react';
import { Button, Dialog, DialogContent, Field, Input, toast } from '../ui';
import { useAuth } from '../auth/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = { email?: string; password?: string };

export function LoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): Errors => {
    const next: Errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (password.length < 6) next.password = 'Use at least 6 characters.';
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (found.email || found.password) return;

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      onOpenChange(false);
      setPassword('');
      toast.success(`Welcome, ${user.name}`, { description: 'Your practice will now be saved.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setErrors({});
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent title="Log in to AgentLanguage" description="Save your results and review past questions.">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field label="Email" error={errors.email}>
            {(p) => (
              <Input
                {...p}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <Field label="Password" error={errors.password}>
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          <Button type="submit" size="lg" block loading={submitting}>
            Continue
          </Button>
          <p className="text-caption text-subtle text-center">
            Demo mode — your account is stored only in this browser.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
