{{- define "beermap-postgres.selectorLabels" -}}
app.kubernetes.io/name: beermap-postgres
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "beermap-postgres.labels" -}}
{{ include "beermap-postgres.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}

{{- define "beermap-postgres.podSecurity" -}}
# uid/gid 999 is the postgres user in the official image.
runAsNonRoot: true
runAsUser: 999
runAsGroup: 999
fsGroup: 999
seccompProfile:
  type: RuntimeDefault
{{- end }}

{{- define "beermap-postgres.containerSecurity" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
capabilities:
  drop: [ALL]
{{- end }}
