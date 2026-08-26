import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf } from "../services/interview.api"
import { useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, error, setError, report, setReport, reports, setReports } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        setError(null)
        let response = null
        try {
            if (!jobDescription.trim()) {
                throw new Error("Please provide a job description.")
            }
            if (!selfDescription.trim() && !resumeFile) {
                throw new Error("Please upload a PDF resume or provide a self-description.")
            }
            if (resumeFile && (resumeFile.type !== "application/pdf" || resumeFile.size > 3 * 1024 * 1024)) {
                throw new Error("Please upload a PDF resume smaller than 3MB.")
            }
            response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response.interviewReport)
        } catch (error) {
            console.log(error)
            setError(error.code === "ECONNABORTED"
                ? "The request took too long. Please try again."
                : error.response?.data?.message || error.message || "Unable to generate the interview plan.")
        } finally {
            setLoading(false)
        }

        return response?.interviewReport ?? null
    }

    const getReportById = async (interviewId) => {
        setLoading(true)
        setError(null)
        let response = null
        try {
            response = await getInterviewReportById(interviewId)
            setReport(response.interviewReport)
        } catch (error) {
            console.error(error)
            setError(error.code === "ECONNABORTED"
                ? "Loading took too long. Please refresh and try again."
                : error.response?.data?.message || "Unable to load this interview plan.")
        } finally {
            setLoading(false)
        }
        return response?.interviewReport ?? null
    }

    const getReports = async () => {
        setLoading(true)
        let response = null
        try {
            response = await getAllInterviewReports()
            setReports(response.interviewReports)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }

        return response.interviewReports
    }

    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        setError(null)
        let response = null
        try {
            response = await generateResumePdf({ interviewReportId })
            const url = window.URL.createObjectURL(response)
            const link = document.createElement("a")
            link.href = url
            link.download = `resume_${interviewReportId}.pdf`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
        }
        catch (error) {
            console.error(error)
            let message = "Unable to download the resume."
            if (error.response?.data instanceof Blob) {
                try {
                    const body = JSON.parse(await error.response.data.text())
                    message = body.message || message
                } catch {
                    // Keep the fallback message when the server response is not JSON.
                }
            } else {
                message = error.response?.data?.message || message
            }
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [ interviewId ])

    return { loading, error, report, reports, generateReport, getReportById, getReports, getResumePdf }

}