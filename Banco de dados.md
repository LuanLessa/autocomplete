# Estrutura de tabelas do banco de dados

Define um esquema para o banco de dados, o nome utilizado aqui é apenas um placeholder
```SQL
CREATE SCHEMA IF NOT EXISTS app;
```

Define os tipos de planos que uma empresa pode contratar
```SQL
CREATE TYPE app.companies_plan AS ENUM ('free', 'premium', 'pro');
COMMENT ON TYPE app.companies_plan IS 'Define os tipos de planos que uma empresa pode contratar';
```

Modelo inicial da tabela Companies
```SQL
CREATE TABLE app.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Dados de Identificação
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  cnpj TEXT UNIQUE NOT NULL
    CONSTRAINT check_cnpj_valido CHECK (app.is_valid_cnpj(cnpj)),

  -- Dados de Gestão do seu SaaS
  plan app.companies_plan DEFAULT 'free',
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Configurações flexíveis
  settings JSONB DEFAULT '{}',

  -- Dados de auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID, --REFERENCES app.profiles(id),
  updated_by UUID, --REFERENCES app.profiles(id),
  deleted_by UUID  --REFERENCES app.profiles(id),
);

COMMENT ON TABLE app.companies IS 'Tabela raiz. Cada linha representa um cliente PJ (uma empresa) que contratou o CRM.';
```
Obs: A tabela vai precisar de uma função para validar o cnpj chamada is_valid_cnpj(), as colunas created_by, updated_by e deleted_by precisam ser referenciadas na tabela após a criação da tabela profiles.

Define os tipos de função que um usário pode ter
```SQL
CREATE TYPE app.user_role AS ENUM ('owner', 'admin', 'agent');
COMMENT ON TYPE app.user_role IS 'Define os tipos de função que um usário pode ter';
```

Modelo inicial da tabela profiles
```SQL
CREATE TABLE app.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_id UUID REFERENCES app.companies(id) NOT NULL,

  -- Dados Pessoais
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  
  -- Permissões
  role app.user_role DEFAULT 'agent' NOT NULL,
  
  -- Status do Agente
  is_active BOOLEAN DEFAULT TRUE,
  is_online BOOLEAN DEFAULT FALSE,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES app.profiles(id),
  updated_by UUID REFERENCES app.profiles(id),
  deleted_by UUID REFERENCES app.profiles(id)
);

COMMENT ON TABLE app.profiles IS 'Dados estendidos dos usuários. Vincula o login (auth) à empresa (company).';
```

```SQL
CREATE TYPE app.integration_provider AS ENUM (
    'waha', -- WhatsApp via WAHA
    'twilio', -- SMS/WhatsApp via Twilio
    'messagebird', -- SMS via MessageBird
    'sendgrid', -- Email via SendGrid
    'mailgun', -- Email via Mailgun
    'custom' -- Integração customizada
);
```

Modelo incial da tabela de conections
```SQL
CREATE TABLE app.connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES app.companies(id) NOT NULL,
  
  name TEXT NOT NULL,
  
  -- INTEGRAÇÃO WAHA
  -- Esse é o ID da sessão que você criou lá no Waha (ex: 'empresa_x_main')
  waha_session_id TEXT NOT NULL,    
  
  -- ESTADO DA CONEXÃO
  -- Valores comuns: 'qrcode', 'connected', 'disconnected', 'timeout'
  status TEXT DEFAULT 'DISCONNECTED', 
  
  -- QR CODE
  -- Se o status for 'qrcode', salvamos a string do código aqui para o front exibir
  qrcode TEXT, 
  
  -- AUDITORIA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(), -- Para saber quando caiu ou voltou
  
  -- REGRA DE SEGURANÇA:
  -- Uma empresa não pode cadastrar a mesma sessão do Waha duas vezes
  UNIQUE (company_id, waha_session_id)
);

COMMENT ON TABLE app.connections IS 'Gerencia as sessões do Waha. O campo waha_session_id faz o vínculo com o container Docker.';
```