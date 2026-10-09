{{- define "beermap-app.selectorLabels" -}}
app.kubernetes.io/name: beermap-app
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "beermap-app.labels" -}}
{{ include "beermap-app.selectorLabels" . }}
app.kubernetes.io/version: {{ .Values.image.tag | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end }}

{{- define "beermap-app.image" -}}
{{- $tag := required "image.tag is required (e.g. sha-<short>)" .Values.image.tag -}}
{{- if eq $tag "latest" }}{{ fail "image.tag must be immutable, not latest" }}{{ end -}}
{{ .Values.image.repository }}:{{ $tag }}
{{- end }}

{{- define "beermap-app.podSecurity" -}}
runAsNonRoot: true
runAsUser: 65532
runAsGroup: 65532
seccompProfile:
  type: RuntimeDefault
{{- end }}

{{- define "beermap-app.containerSecurity" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
capabilities:
  drop: [ALL]
{{- end }}

