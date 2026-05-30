"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Cable, Brain, Plug, Settings2, AlertCircle, Check } from "lucide-react"

const SectionCard = ({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          {icon}
        </div>
        <div>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
)

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  const handleSave = (key: string) => {
    setSaved((prev) => ({ ...prev, [key]: true }))
    setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000)
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure data streaming and AI integrations
        </p>
      </div>

      <div className="space-y-4 px-4 lg:px-6">
        {/* Kafka Streaming */}
        <SectionCard
          icon={<Cable className="size-5" />}
          title="Kafka Data Streaming"
          description="Configure real-time data ingestion from Apache Kafka topics"
        >
          <div className="space-y-1">
            <SettingsRow
              label="Bootstrap Servers"
              description="host1:9092,host2:9092"
            >
              <Input
                placeholder="localhost:9092"
                className="w-56"
                defaultValue="localhost:9092"
              />
            </SettingsRow>
            <Separator />
            <SettingsRow
              label="Consumer Group ID"
              description="Unique group identifier"
            >
              <Input
                placeholder="datastorm-consumer"
                className="w-56"
                defaultValue="datastorm-consumer"
              />
            </SettingsRow>
            <Separator />
            <SettingsRow
              label="Input Topic"
              description="Raw transaction events"
            >
              <Input
                placeholder="raw.transactions"
                className="w-56"
                defaultValue="raw.transactions"
              />
            </SettingsRow>
            <Separator />
            <SettingsRow
              label="Output Topic"
              description="Processed demand predictions"
            >
              <Input
                placeholder="predictions.output"
                className="w-56"
                defaultValue="predictions.output"
              />
            </SettingsRow>
            <Separator />
            <SettingsRow
              label="Security Protocol"
              description="SASL_SSL / PLAINTEXT"
            >
              <Input
                placeholder="SASL_SSL"
                className="w-56"
                defaultValue="SASL_SSL"
              />
            </SettingsRow>
            <Separator />
            <SettingsRow
              label="SASL Username"
              description="Kafka authentication"
            >
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="w-40"
                  defaultValue="admin"
                />
                <Badge variant="outline" className="text-xs">
                  stored
                </Badge>
              </div>
            </SettingsRow>
            <Separator />
            <SettingsRow
              label="Auto Offset Reset"
              description="earliest / latest"
            >
              <Input
                placeholder="earliest"
                className="w-56"
                defaultValue="earliest"
              />
            </SettingsRow>
            <div className="flex items-center gap-2 pt-4">
              <Button onClick={() => handleSave("kafka")}>
                {saved.kafka ? (
                  <>
                    <Check className="size-4" /> Saved
                  </>
                ) : (
                  "Save Kafka Settings"
                )}
              </Button>
              <Button variant="outline">
                <Plug className="size-4" /> Test Connection
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* Gen AI API Keys */}
        <SectionCard
          icon={<Brain className="size-5" />}
          title="Gen AI API Keys"
          description="API credentials for LLM-powered explainability features"
        >
          <div className="space-y-1">
            <SettingsRow
              label="OpenAI API Key"
              description="Used for outlet-level explanations"
            >
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="sk-••••••••••••••••"
                  className="w-56"
                  defaultValue=""
                />
                  <Badge variant="outline" className="text-xs text-amber-600">
                  <AlertCircle className="size-3" /> not set
                </Badge>
              </div>
            </SettingsRow>
            <Separator />
            <SettingsRow
              label="OpenAI Model"
              description="GPT-4o / GPT-4o-mini"
            >
              <Input
                placeholder="gpt-4o-mini"
                className="w-56"
                defaultValue="gpt-4o-mini"
              />
            </SettingsRow>
            <Separator />
            <SettingsRow
              label="Gemini API Key"
              description="Alternative LLM provider"
            >
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="w-56"
                  defaultValue=""
                />
                                  <Badge variant="outline" className="text-xs text-amber-600">
                  <AlertCircle className="size-3" /> not set
                </Badge>
              </div>
            </SettingsRow>
            <Separator />
            <SettingsRow label="Max Tokens" description="Per explanation">
              <Input
                type="number"
                placeholder="512"
                className="w-56"
                defaultValue="512"
              />
            </SettingsRow>
            <Separator />
            <SettingsRow label="Temperature" description="0.0 – 1.0">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                placeholder="0.3"
                className="w-56"
                defaultValue="0.3"
              />
            </SettingsRow>
            <div className="flex items-center gap-2 pt-4">
              <Button onClick={() => handleSave("genai")}>
                {saved.genai ? (
                  <>
                    <Check className="size-4" /> Saved
                  </>
                ) : (
                  "Save API Settings"
                )}
              </Button>
              <Button variant="outline">Validate Keys</Button>
            </div>
          </div>
        </SectionCard>

        {/* Pipeline Settings */}
        <SectionCard
          icon={<Settings2 className="size-5" />}
          title="Data Pipeline"
          description="General pipeline configuration"
        >
          <div className="space-y-1">
            <SettingsRow
              label="Output Directory"
              description="Final predictions and allocations"
            >
              <Input
                placeholder="data/output/"
                className="w-56"
                defaultValue="data/output/"
              />
            </SettingsRow>
            <Separator />
            <SettingsRow
              label="Batch Size"
              description="Rows per processing batch"
            >
              <Input
                type="number"
                placeholder="10000"
                className="w-56"
                defaultValue="10000"
              />
            </SettingsRow>
            <Separator />
            <SettingsRow
              label="Retry Limit"
              description="Max retries on API failure"
            >
              <Input
                type="number"
                placeholder="3"
                className="w-56"
                defaultValue="3"
              />
            </SettingsRow>
            <div className="flex items-center gap-2 pt-4">
              <Button onClick={() => handleSave("pipeline")}>
                {saved.pipeline ? (
                  <>
                    <Check className="size-4" /> Saved
                  </>
                ) : (
                  "Save Pipeline Settings"
                )}
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
