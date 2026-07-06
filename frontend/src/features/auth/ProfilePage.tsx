import { useState, type ChangeEvent, type FormEvent } from 'react'
import { changePassword } from './authApi'
import { useAvatar, useUpdateAvatar } from './useAvatar'
import { getApiErrorMessage } from '../../api/errors'

// Base64 inflates raw bytes by ~4/3, plus a short "data:image/...;base64," prefix — 1.4MB of raw
// image data lands comfortably under the backend's 2,000,000-character limit on the encoded data
// URL (UpdateAvatarCommandValidator), where a straight 1.5MB raw cutoff would not (1.5MB encodes to
// just over 2,000,000 characters, letting a file the client accepts still fail the server's check).
const MAX_AVATAR_FILE_BYTES = 1.4 * 1024 * 1024

const fieldClassName =
  'rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

export function ProfilePage() {
  return (
    <div className="mx-auto mt-12 w-[80%] max-w-lg">
      <h1 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Profile</h1>
      <AvatarSection />
      <hr className="my-8 border-gray-200 dark:border-gray-800" />
      <ChangePasswordSection />
    </div>
  )
}

function AvatarSection() {
  const { data: avatarDataUrl } = useAvatar()
  const updateAvatarMutation = useUpdateAvatar()

  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null)
    setSuccess(false)
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_AVATAR_FILE_BYTES) {
      setError('Image is too large — please choose one under 1.4MB.')
      setPreview(null)
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!preview) return
    setError(null)
    setSuccess(false)
    try {
      await updateAvatarMutation.mutateAsync(preview)
      setSuccess(true)
      setPreview(null)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not update avatar.'))
    }
  }

  const displayedAvatar = preview ?? avatarDataUrl

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Avatar</h2>

      <div className="flex items-center gap-4">
        {displayedAvatar ? (
          <img
            src={displayedAvatar}
            alt="Avatar preview"
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            No avatar
          </div>
        )}

        <div className="flex flex-col gap-2">
          <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm text-gray-900 dark:text-gray-100" />
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!preview || updateAvatarMutation.isPending}
            className="w-fit rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
          >
            {updateAvatarMutation.isPending ? 'Saving…' : 'Save avatar'}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-600 dark:text-green-400">Avatar updated.</p>}
    </section>
  )
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword !== confirmNewPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setSuccess(true)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not change password.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Change password</h2>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          Password changed.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="currentPassword" className="text-sm text-gray-900 dark:text-gray-100">
            Current password
          </label>
          <input
            id="currentPassword"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={fieldClassName}
          />
        </div>
        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="newPassword" className="text-sm text-gray-900 dark:text-gray-100">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={fieldClassName}
          />
        </div>
        <div className="flex flex-col gap-1 text-left">
          <label htmlFor="confirmNewPassword" className="text-sm text-gray-900 dark:text-gray-100">
            Confirm new password
          </label>
          <input
            id="confirmNewPassword"
            type="password"
            required
            minLength={8}
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            className={fieldClassName}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-fit rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          {isSubmitting ? 'Changing…' : 'Change password'}
        </button>
      </form>
    </section>
  )
}
