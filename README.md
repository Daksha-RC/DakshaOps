# DakshaOps
DakshaOps is the GitOps automation layer for the Daksha-RC ecosystem, designed to manage and provision cloud-native infrastructure using Pulumi. It enables declarative, version-controlled infrastructure as code (IaC) workflows, ensuring consistent, auditable, and automated deployments across development, staging, and production environments.

## Development

### Prerequisites
- Node.js (v18 or later)
- Yarn package manager
- Pulumi CLI

### Setup
1. Clone the repository
2. Install dependencies:
   ```
   yarn install
   ```

### Code Validation
Before submitting changes, validate your code using the TypeScript compiler:

```bash
# Run TypeScript type checking
yarn validate
```

This command runs the TypeScript compiler in `--noEmit` mode, which checks for type errors without generating JavaScript output files. It helps catch type-related issues early in the development process.

If you encounter any errors, fix them before proceeding with deployment or submitting your changes.

### Available Scripts
- `yarn type-check`: Run TypeScript compiler to check types without emitting files
- `yarn validate`: Alias for `yarn type-check`
