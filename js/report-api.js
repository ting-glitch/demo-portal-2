window.CardStatementReports = (() => {
    async function requestJson(url) {
        const response = await fetch(url);
        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || `Request failed: ${response.status}`);
        }
        return response.json();
    }

    function buildStatementReportUrl(filters = {}) {
        const params = new URLSearchParams();
        if (filters.billMonth) params.set("bill_month", filters.billMonth);
        if (filters.year) params.set("year", filters.year);
        const query = params.toString();
        return `/api/reports/statement${query ? `?${query}` : ""}`;
    }

    return {
        getPeriods() {
            return requestJson("/api/reports/periods");
        },
        getStatementReport(filters = {}) {
            return requestJson(buildStatementReportUrl(filters));
        },
    };
})();

