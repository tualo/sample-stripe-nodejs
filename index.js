const express = require('express')
const fs = require('fs')
const config = require('dotenv').config() // Load environment variables from .env file
const stripe = require('stripe').Stripe(config.parsed.stripekey) // Use the key from .env file


const app = express()
const port = 3000

// Pug Template Engine konfigurieren
app.set('view engine', 'pug')
app.set('views', './views')

app.get('/', (req, res) => {
    res.render('index', { title: 'Stripe Translator Account Management' })
})

app.get('/create-translator-account', async (req, res) => {

    const accountData = require('./account-data.json');
    console.log(accountData);

    let x = await stripe.accounts.create({
        type: 'express',
        country: accountData.country,
        email: accountData.email,
        capabilities: {
            transfers: { requested: true }
        },
        business_type: accountData.business_type || 'individual',
        business_profile: {
            mcc: accountData.business_profile.mcc,
            product_description: accountData.business_profile.product_description,
            url: accountData.business_profile.url,
            support_email: accountData.business_profile.support_email,
            support_phone: accountData.business_profile.support_phone
        },
        external_account: {
            object: 'bank_account',
            country: accountData.country,
            currency: accountData.currency,
            account_holder_name: accountData.account_holder_name,
            account_holder_type: accountData.account_holder_type || 'individual',
            routing_number: accountData.routing_number,
            account_number: accountData.iban || accountData.account_number,
            // Optional: If you have an IBAN, you can use it instead of routing_number
            // iban: accountData.iban,
        },
        individual: {
            first_name: accountData.first_name,
            last_name: accountData.last_name,
            email: accountData.email,
            phone: accountData.phone,
            address: {
                line1: accountData.address_line1,
                city: accountData.city,
                postal_code: accountData.postal_code,
                country: accountData.country
            },
            dob: {
                day: accountData.birth_day,
                month: accountData.birth_month,
                year: accountData.birth_year
            }
        },
        settings: {
            payouts: {
                schedule: {
                    interval: 'manual'
                }
            }
        },
    });
    console.log(x);
    const accountId = x.id;
    fs.writeFileSync('account-id.txt', accountId);
    console.log('Account ID:', accountId);
    let accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: 'https://world-contact.de/',
        return_url: 'https://world-contact.de/',
        type: 'account_onboarding',
    });
    console.log(accountLink);
    res.redirect(accountLink.url);
    // res.send('Translator account creation initiated. Check console for details.');
});



app.get('/check-translator-account', async (req, res) => {
    try {
        const accountId = fs.readFileSync('account-id.txt', 'utf8');
        console.log('Account ID:', accountId);
        let account = await stripe.accounts.retrieve(accountId);
        console.log(account);

        if (account.details_submitted) {
            console.log('Account is ready for payouts.');
            res.render('account-status', {
                title: 'Account Status',
                ready: true,
                accountId: accountId
            });
        } else {
            console.log('Account is not ready yet.');
            res.render('account-status', {
                title: 'Account Status',
                ready: false,
                accountId: accountId
            });
        }
    } catch (error) {
        console.error('Error checking account:', error);
        res.render('account-status', {
            title: 'Account Status',
            ready: false,
            error: 'Fehler beim Laden des Account-Status. Möglicherweise existiert noch kein Account.'
        });
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port http://localhost:${port}`)
});