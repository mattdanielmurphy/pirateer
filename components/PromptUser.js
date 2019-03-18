const prompts = require('prompts')

class PromptUser {
	async askAll(sortBySeeders) {
		await this.askTitle()
		await this.askMinSeeders()
		await this.askMinFileSize()
		if (!sortBySeeders) await this.askSortBy()
		if (this.sortBy !== 'seeders' && !sortBySeeders) await this.askSortOrder()
		return { ...this }
	}
	async askTitle() {
		return await prompts({
			type: 'text',
			name: 'title',
			message: 'What is the title of the movie?',
			validate: (name) => (name.length < 2 ? 'You must provide the title of the movie.' : true)
		}).then(({ title }) => (this.title = title))
	}
	async askMinSeeders() {
		return await prompts({
			type: 'number',
			name: 'minSeeders',
			message: 'Minimum seeders: (default: 2)',
			min: 1,
			initial: 2
		}).then(({ minSeeders }) => (this.minSeeders = minSeeders))
	}
	async askMinFileSize() {
		return await prompts({
			type: 'number',
			name: 'minFileSize',
			message: 'Minimum file size: (in GB, default: 1)',
			min: 0,
			increment: 0.1,
			initial: 1
		}).then(({ minFileSize }) => (this.minFileSize = minFileSize))
	}
	async askSortBy() {
		return await prompts({
			type: 'select',
			name: 'sortBy',
			message: 'How shall I sort your results?',
			choices: [
				{ title: 'File Size', value: 'fileSize' },
				{ title: 'Seeders', value: 'seeders' },
				{ title: 'Date Uploaded', value: 'dateUploaded' }
			],
			initial: 0
		}).then(({ sortBy }) => (this.sortBy = sortBy))
	}
	async askSortOrder() {
		return await prompts({
			type: 'select',
			name: 'sortOrder',
			message: '...in which order?',
			choices: [ { title: 'Descending', value: 'descending' }, { title: 'Ascending', value: 'ascending' } ],
			initial: 0
		}).then(({ sortOrder }) => (this.sortOrder = sortOrder))
	}
}

exports.PromptUser = PromptUser
