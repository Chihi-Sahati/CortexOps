-- CortexOps Initial PostgreSQL Migration
-- Created: 2026-03-30

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateTable: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: api_keys
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" VARCHAR(8) NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable: workflows
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "triggerType" TEXT,
    "cronExpression" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "searchVector" TSVECTOR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable: workflow_nodes
CREATE TABLE "workflow_nodes" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "searchVector" TSVECTOR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: workflow_edges
CREATE TABLE "workflow_edges" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "condition" JSONB,
    "label" TEXT,
    "edgeType" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable: executions
CREATE TABLE "executions" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "triggerType" TEXT,
    "triggerData" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: execution_steps
CREATE TABLE "execution_steps" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT,
    "status" TEXT NOT NULL,
    "inputData" JSONB,
    "outputData" JSONB,
    "errorDetails" JSONB,
    "strategyUsed" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable: agent_traces
CREATE TABLE "agent_traces" (
    "id" TEXT NOT NULL,
    "executionStepId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "thought" TEXT,
    "action" TEXT,
    "actionInput" JSONB,
    "observation" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "modelUsed" TEXT,
    "tokensUsed" INTEGER,
    "stepNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable: credentials
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable: connectors
CREATE TABLE "connectors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "serviceName" TEXT,
    "baseUrl" TEXT,
    "authType" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
    "lastHealthCheck" TIMESTAMP(3),
    "selfHealCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" JSONB,
    "generatedCode" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable: llm_cache
CREATE TABLE "llm_cache" (
    "id" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "queryText" TEXT NOT NULL,
    "responseText" TEXT NOT NULL,
    "modelUsed" TEXT,
    "tokensUsed" INTEGER,
    "similarityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "llm_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable: audit_logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: users
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex: api_keys
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");
CREATE INDEX "api_keys_keyHash_idx" ON "api_keys"("keyHash");
CREATE INDEX "api_keys_prefix_idx" ON "api_keys"("prefix");

-- CreateIndex: workflows
CREATE INDEX "workflows_ownerId_idx" ON "workflows"("ownerId");
CREATE INDEX "workflows_status_idx" ON "workflows"("status");
CREATE INDEX "workflows_triggerType_idx" ON "workflows"("triggerType");
CREATE INDEX "workflows_updatedAt_idx" ON "workflows"("updatedAt" DESC);
CREATE INDEX "workflows_name_description_trgm_idx" ON "workflows" USING GIN ("name" gin_trgm_ops, "description" gin_trgm_ops);
CREATE INDEX "workflows_searchVector_idx" ON "workflows" USING GIN ("searchVector");

-- CreateIndex: workflow_nodes
CREATE INDEX "workflow_nodes_workflowId_idx" ON "workflow_nodes"("workflowId");
CREATE INDEX "workflow_nodes_type_idx" ON "workflow_nodes"("type");
CREATE INDEX "workflow_nodes_searchVector_idx" ON "workflow_nodes" USING GIN ("searchVector");

-- CreateIndex: workflow_edges
CREATE INDEX "workflow_edges_workflowId_idx" ON "workflow_edges"("workflowId");
CREATE INDEX "workflow_edges_sourceNodeId_idx" ON "workflow_edges"("sourceNodeId");
CREATE INDEX "workflow_edges_targetNodeId_idx" ON "workflow_edges"("targetNodeId");

-- CreateIndex: executions
CREATE INDEX "executions_workflowId_idx" ON "executions"("workflowId");
CREATE INDEX "executions_status_idx" ON "executions"("status");
CREATE INDEX "executions_createdAt_idx" ON "executions"("createdAt" DESC);
CREATE INDEX "executions_workflowId_status_idx" ON "executions"("workflowId", "status");
CREATE INDEX "executions_workflowId_createdAt_idx" ON "executions"("workflowId", "createdAt" DESC);

-- CreateIndex: execution_steps
CREATE INDEX "execution_steps_executionId_idx" ON "execution_steps"("executionId");
CREATE INDEX "execution_steps_nodeId_idx" ON "execution_steps"("nodeId");
CREATE INDEX "execution_steps_status_idx" ON "execution_steps"("status");
CREATE INDEX "execution_steps_executionId_status_idx" ON "execution_steps"("executionId", "status");

-- CreateIndex: agent_traces
CREATE INDEX "agent_traces_executionStepId_idx" ON "agent_traces"("executionStepId");
CREATE INDEX "agent_traces_agentType_idx" ON "agent_traces"("agentType");

-- CreateIndex: credentials
CREATE INDEX "credentials_ownerId_idx" ON "credentials"("ownerId");
CREATE INDEX "credentials_type_idx" ON "credentials"("type");
CREATE UNIQUE INDEX "credentials_ownerId_name_key" ON "credentials"("ownerId", "name");

-- CreateIndex: connectors
CREATE UNIQUE INDEX "connectors_name_key" ON "connectors"("name");
CREATE INDEX "connectors_type_idx" ON "connectors"("type");
CREATE INDEX "connectors_healthStatus_idx" ON "connectors"("healthStatus");
CREATE INDEX "connectors_serviceName_idx" ON "connectors"("serviceName");

-- CreateIndex: llm_cache
CREATE UNIQUE INDEX "llm_cache_queryHash_key" ON "llm_cache"("queryHash");
CREATE INDEX "llm_cache_queryHash_idx" ON "llm_cache"("queryHash");
CREATE INDEX "llm_cache_modelUsed_idx" ON "llm_cache"("modelUsed");
CREATE INDEX "llm_cache_expiresAt_idx" ON "llm_cache"("expiresAt");
CREATE INDEX "llm_cache_createdAt_idx" ON "llm_cache"("createdAt" DESC);

-- CreateIndex: audit_logs
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_riskLevel_idx" ON "audit_logs"("riskLevel");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");
CREATE INDEX "audit_logs_userId_action_idx" ON "audit_logs"("userId", "action");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_nodes" ADD CONSTRAINT "workflow_nodes_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "executions" ADD CONSTRAINT "executions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "execution_steps" ADD CONSTRAINT "execution_steps_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "execution_steps" ADD CONSTRAINT "execution_steps_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "workflow_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agent_traces" ADD CONSTRAINT "agent_traces_executionStepId_fkey" FOREIGN KEY ("executionStepId") REFERENCES "execution_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create search vector trigger function
CREATE OR REPLACE FUNCTION workflow_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION workflow_node_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.type, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for search vector updates
CREATE TRIGGER workflow_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "workflows"
  FOR EACH ROW EXECUTE FUNCTION workflow_search_vector_update();

CREATE TRIGGER workflow_node_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "workflow_nodes"
  FOR EACH ROW EXECUTE FUNCTION workflow_node_search_vector_update();
