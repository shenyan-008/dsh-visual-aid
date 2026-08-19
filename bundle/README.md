# @sy008/dsh-visual-aid-bundle

Thin dsh bundle that installs both:

- `@sy008/dsh-visual-aid` (host backend)
- `@sy008/dsh-client-ui-visual-aid` (web client)

## Install

```bash
dsh plugin --profile web add @sy008/dsh-visual-aid-bundle@0.1.0-rc.8
```

After installation, restart dsh and enable **Visual Aid** in settings.

Closing the vision model from the top bar fully disables Visual Aid (no image preprocessing, projection, or vision tools) and keeps the settings switch in sync.
